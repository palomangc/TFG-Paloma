<?php
namespace App\Controller;

use App\Repository\ReservationRepository;
use DateTimeImmutable;
use DateInterval;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class AvailabilityMonthController extends AbstractController
{
    private ReservationRepository $repo;

    // ---------------------- constructor ----------------------
    public function __construct(ReservationRepository $repo)
    {
        $this->repo = $repo;
    }

    /**
     * GET /api/availability-month?year=2025&month=12&service=standard
     * Devuelve [{ "day": "YYYY-MM-DD", "count": N }, ...] para todos los días del mes.
     */
    #[Route('/api/availability-month', name: 'api_availability_month', methods: ['GET'])]
    public function availabilityMonth(Request $req): JsonResponse
    {
        // ---------------------- Parámetros y validación ----------------------
        $year = (int) $req->query->get('year', (int) date('Y'));
        $month = (int) $req->query->get('month', (int) date('n')); // 1..12
        $service = $req->query->get('service', 'standard');

        if ($month < 1 || $month > 12) {
            return $this->json(['error' => 'Mes inválido'], 400);
        }

        // ---------------------- Configuración compartida ----------------------
        // Mantén estos valores coherentes con tu /api/availability
        $durations = ['standard' => 60, 'large' => 180];
        $duration = $durations[$service] ?? 60;
        $buffer = 15; // minutos
        $step   = 15; // minutos

        // Periodos según día de la semana: función pequeña para claridad
        $getPeriodsForDow = function(int $dow) use ($service) {
            if ($dow >= 1 && $dow <= 5) {
                return [['10:00','14:00'], ['17:00','20:00']];
            } elseif ($dow === 6) {
                // sábado: según tu lógica solo permite 'large' (igual que /api/availability)
                if ($service !== 'large') return [];
                return [['10:00','14:00']];
            } else {
                // domingo cerrado
                return [];
            }
        };

        // ---------------------- Rango del mes y consulta única a BD ----------------------
        $firstOfMonth = new DateTimeImmutable(sprintf('%04d-%02d-01 00:00:00', $year, $month));
        // último día del mes
        $daysInMonth = (int) $firstOfMonth->format('t');
        $startRange = $firstOfMonth;
        $endRange = new DateTimeImmutable(sprintf('%04d-%02d-%02d 23:59:59', $year, $month, $daysInMonth));

        // Traer de la BD todas las reservas "confirmadas" en el rango (una sola query)
        $reservations = $this->repo->findConfirmedReservationsBetween($startRange, $endRange);
        // $reservations es array de Reservation entities con getStartAt() y getDuration()

        // ---------------------- Convertir reservas a estructura más ligera (en memoria) ----------------------
        // Normalizar a DateTimeImmutable y duración en minutos
        $resList = [];
        foreach ($reservations as $r) {
            $datePart = $r->getDate(); // DateTime / DateTimeImmutable
            $timePart = $r->getTime(); // DateTime / DateTimeImmutable (solo hora)

            // Normalizar a DateTimeImmutable y construir 'Y-m-d H:i:s'
            $dateStr = $datePart->format('d-m-Y');
            $timeStr = $timePart->format('H:i:s');

            $startAt = DateTimeImmutable::createFromFormat('d-m-Y H:i:s', $dateStr . ' ' . $timeStr);
            if ($startAt === false) {
                // fallback: intentar crear desde mutable si fuera el caso
                $startAt = new DateTimeImmutable($dateStr . ' ' . $timeStr);
            }

            $resList[] = [
                'start' => $startAt,
                'duration' => (int) $r->getDuration()
            ];
        }

        // Helper: comprobar colisión entre intervalos: startA < endB && startB < endA
        $overlaps = function(DateTimeImmutable $aStart, DateTimeImmutable $aEnd, DateTimeImmutable $bStart, DateTimeImmutable $bEnd) {
            return ($aStart < $bEnd) && ($bStart < $aEnd);
        };

        // ---------------------- Recorremos cada día y contamos franjas libres ----------------------
        $now = new DateTimeImmutable();
        $minAllowedGlobal = $now->modify('+24 hours');

        $result = [];

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $date = new DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $d));
            $dow = (int)$date->format('N'); // 1..7

            // Obtener periodos para el día (si está cerrado devolver count=0)
            $periods = $getPeriodsForDow($dow);
            if (empty($periods)) {
                $result[] = ['day' => $date->format('Y-m-d'), 'count' => 0];
                continue;
            }

            $slotsCount = 0;
            // Para optimizar: filtrar solo las reservas que intersectan este día (por si quieres)
            $reservationsThisDay = array_filter($resList, function($rr) use ($date) {
                return $rr['start']->format('Y-m-d') === $date->format('Y-m-d')
                       || $rr['start']->format('Y-m-d') < $date->format('Y-m-d')
                       || $rr['start']->format('Y-m-d') > $date->format('Y-m-d'); // keep as baseline; we'll check overlaps anyway
            });
            // Nota: la comprobación de solapamiento se hace con 'overlaps' abajo.

            foreach ($periods as [$startStr, $endStr]) {
                $periodStart = new DateTimeImmutable($date->format('Y-m-d') . ' ' . $startStr);
                $periodEnd   = new DateTimeImmutable($date->format('Y-m-d') . ' ' . $endStr);

                $current = $periodStart;

                while ($current <= $periodEnd) {
                    $slotEnd = $current->modify("+{$duration} minutes");
                    if ($slotEnd > $periodEnd) {
                        break;
                    }

                    // cumplir antelación de 24h
                    if ($current < $minAllowedGlobal) {
                        $current = $current->modify("+{$step} minutes");
                        continue;
                    }

                    // calcular intervalo del slot considerando buffer: ampliamos el slot con buffer para comprobar solapes
                    $slotCheckStart = $current->modify("-{$buffer} minutes");
                    $slotCheckEnd = $slotEnd->modify("+{$buffer} minutes");

                    // Comprobamos colisión contra las reservas en memoria
                    $isFree = true;
                    foreach ($resList as $res) {
                        $resStart = $res['start'];
                        $resEnd = $resStart->modify('+' . $res['duration'] . ' minutes');

                        if ($overlaps($slotCheckStart, $slotCheckEnd, $resStart, $resEnd)) {
                            $isFree = false;
                            break;
                        }
                    }

                    if ($isFree) {
                        $slotsCount++;
                    }

                    $current = $current->modify("+{$step} minutes");
                }
            }

            $result[] = [
                'day' => $date->format('Y-m-d'),
                'count' => $slotsCount
            ];
        }

        return $this->json($result, 200);
    }
}

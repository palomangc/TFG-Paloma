<?php
namespace App\Controller;

use App\Repository\ReservationRepository;
use DateTimeImmutable;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class AvailabilityController extends AbstractController
{
    private ReservationRepository $repo;

    public function __construct(ReservationRepository $repo)
    {
        $this->repo = $repo;
    }

    #[Route('/api/availability', name: 'api_availability', methods: ['GET'])]
    public function availability(Request $req): JsonResponse
    {
        $dateStr = $req->query->get('date');
        $service = $req->query->get('service', 'standard');

        if (!$dateStr) {
            return $this->json([], 200);
        }

        try {
            $date = new DateTimeImmutable($dateStr);
        } catch (\Throwable $e) {
            return $this->json(['error' => 'Formato de fecha inválido'], 400);
        }

        $dow = (int)$date->format('N'); // 1..7 (7 = domingo)

        // Duraciones
        $durations = ['standard' => 60, 'large' => 180];
        $duration = $durations[$service] ?? 60;

        $buffer = 15; // minutos
        $step   = 15; // minutos

        // Periodos
        if ($dow >= 1 && $dow <= 5) {
            $periods = [['10:00','14:00'], ['17:00','20:00']];
        } elseif ($dow === 6) {
            // sábado
            if ($service !== 'large') {
                return $this->json([], 200);
            }
            $periods = [['10:00','14:00']];
        } else {
            // domingo cerrado
            return $this->json([], 200);
        }

        $slots = [];
        $now = new DateTimeImmutable();
        $minAllowed = $now->modify('+24 hours');

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
                if ($current < $minAllowed) {
                    $current = $current->modify("+{$step} minutes");
                    continue;
                }

                // ❗ Llamada correcta a isSlotFree (4 argumentos exactos)
                if ($this->repo->isSlotFree(
                    $date,                     // DateTimeInterface (solo fecha)
                    $current->format('H:i'),   // hora string
                    $duration,                 // duración
                    $buffer                    // buffer
                )) {
                    $slots[] = $current->format('H:i');
                }

                $current = $current->modify("+{$step} minutes");
            }
        }

        $unique = array_values(array_unique($slots));
        sort($unique);

        return $this->json($unique, 200);
    }
}

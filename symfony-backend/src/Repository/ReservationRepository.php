<?php
namespace App\Repository;

use App\Entity\Reservation;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use DateTimeInterface;
use DateTime;
use DateTimeImmutable; // <<< añadido

/**
 * @extends ServiceEntityRepository<Reservation>
 */
class ReservationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Reservation::class);
    }

    /**
     * Comprueba si existe reserva que solape
     *
     * @param DateTimeInterface $date Fecha (solo la parte fecha se usa)
     * @param string $time Hora en formato 'H:i' o 'H:i:s'
     * @param int $duration Duración en minutos
     * @param int $buffer Buffer en minutos
     * @return bool true si el slot está libre
     */
    public function isSlotFree(DateTimeInterface $date, string $time, int $duration, int $buffer): bool
    {
        // Construir los DateTime de inicio/fin solicitados
        $requestedStart = new DateTime($date->format('Y-m-d') . ' ' . $time);
        $requestedEnd = (clone $requestedStart)->modify("+{$duration} minutes")->modify("+{$buffer} minutes");

        // Traer reservas del mismo día que no estén rechazadas
        $qb = $this->createQueryBuilder('r')
            ->andWhere('r.date = :date')
            ->andWhere('r.status != :rejected')
            ->setParameter('date', $date->format('Y-m-d'))
            ->setParameter('rejected', 'rejected');

        $reservations = $qb->getQuery()->getResult();

        foreach ($reservations as $r) {
            $existingStart = new DateTime($r->getDate()->format('Y-m-d') . ' ' . $r->getTime()->format('H:i:s'));
            $existingEnd = (clone $existingStart)->modify('+' . (int)$r->getDuration() . ' minutes');

            if ($existingStart < $requestedEnd && $existingEnd > $requestedStart) {
                return false;
            }
        }

        // ningún solapamiento encontrado
        return true;
    }

    // ------------------ MÉTODO AÑADIDO (MÍNIMO) ------------------
    /**
     * Devuelve reservas confirmadas cuyo start (date+time) está entre $start y $end (inclusive).
     * Ajusta 'status' si usas otro valor para reservas válidas (ej. 'confirmed', 'paid', etc).
     *
     * @param DateTimeImmutable $start
     * @param DateTimeImmutable $end
     * @return Reservation[]
     */
    public function findConfirmedReservationsBetween(DateTimeImmutable $start, DateTimeImmutable $end): array
    {
        // Asumimos que en la entidad tienes campos 'date' (Date) y 'time' (Time) separados.
        // Hacemos una query que combine date y time en la comparación usando r.date BETWEEN start_date AND end_date
        // y luego filtramos por status != 'rejected'.
        // Para simplicidad y compatibilidad, filtramos por date BETWEEN start_date (Y-m-d) and end_date (Y-m-d)
        // y ordenamos por date+time asc.

        // Convertir a strings para parámetros
        $startDateStr = $start->format('Y-m-d 00:00:00');
        $endDateStr = $end->format('Y-m-d 23:59:59');

        // Si en tu entidad 'startAt' ya existe como DateTime, puedes adaptar la query fácilmente.
        $qb = $this->createQueryBuilder('r')
            ->andWhere('r.date BETWEEN :startDate AND :endDate')
            ->andWhere('r.status != :rejected')
            ->setParameter('startDate', $start->format('Y-m-d'))
            ->setParameter('endDate', $end->format('Y-m-d'))
            ->setParameter('rejected', 'rejected')
            ->orderBy('r.date', 'ASC')
            ->addOrderBy('r.time', 'ASC');

        return $qb->getQuery()->getResult();
    }
    // ----------------------------------------------------------
}

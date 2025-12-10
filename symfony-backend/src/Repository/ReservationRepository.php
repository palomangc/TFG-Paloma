<?php
namespace App\Repository;

use App\Entity\Reservation;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use DateTimeInterface;
use DateTime;

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
}

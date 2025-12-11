<?php

namespace App\Controller\Api;

use App\Entity\Reservation;
use App\Repository\ReservationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/reservations')]
class AdminReservationApiController extends AbstractController
{
    #[Route('', name: 'api_admin_reservations_list', methods: ['GET'])]
    public function list(Request $request, ReservationRepository $repo): JsonResponse
    {
        $status = $request->query->get('status');
        $q = $request->query->get('q');

        $criteria = [];
        if ($status) {
            $criteria['status'] = $status;
        }

        $reservations = $repo->findBy($criteria, ['createdAt' => 'DESC']);

        if ($q) {
            $qLower = mb_strtolower($q);
            $reservations = array_filter($reservations, function (Reservation $r) use ($qLower) {
                $fields = [
                    $r->getName(),
                    $r->getEmail(),
                    $r->getService(),
                ];
                foreach ($fields as $f) {
                    if ($f !== null && mb_stripos($f, $qLower) !== false) {
                        return true;
                    }
                }
                return false;
            });
        }

        $data = array_map(function (Reservation $r) {
            $dateTime = new \DateTime(
                $r->getDate()->format('Y-m-d') . ' ' . $r->getTime()->format('H:i:s')
            );

            return [
                'id'      => $r->getId(),
                'name'    => $r->getName(),
                'email'   => $r->getEmail(),
                'date'    => $dateTime->format(\DateTimeInterface::ATOM),
                'service' => $r->getService(),
                'status'  => $r->getStatus(),
            ];
        }, $reservations);

        return new JsonResponse(array_values($data));
    }

    #[Route('/{id}', name: 'api_admin_reservations_show', methods: ['GET'])]
    public function show(Reservation $reservation): JsonResponse
    {
        $dateTime = new \DateTime(
            $reservation->getDate()->format('Y-m-d') . ' ' . $reservation->getTime()->format('H:i:s')
        );

        $data = [
            'id'      => $reservation->getId(),
            'name'    => $reservation->getName(),
            'email'   => $reservation->getEmail(),
            'date'    => $dateTime->format(\DateTimeInterface::ATOM),
            'service' => $reservation->getService(),
            'status'  => $reservation->getStatus(),
        ];

        return new JsonResponse($data);
    }

    #[Route('/{id}/confirm', name: 'api_admin_reservations_confirm', methods: ['POST'])]
    public function confirm(Reservation $reservation, EntityManagerInterface $em): JsonResponse
    {
        $reservation->setStatus('confirmed');
        $em->flush();

        $dateTime = new \DateTime(
            $reservation->getDate()->format('Y-m-d') . ' ' . $reservation->getTime()->format('H:i:s')
        );

        $data = [
            'id'      => $reservation->getId(),
            'name'    => $reservation->getName(),
            'email'   => $reservation->getEmail(),
            'date'    => $dateTime->format(\DateTimeInterface::ATOM),
            'service' => $reservation->getService(),
            'status'  => $reservation->getStatus(),
        ];

        return new JsonResponse($data);
    }

    #[Route('/{id}/cancel', name: 'api_admin_reservations_cancel', methods: ['POST'])]
    public function cancel(Reservation $reservation, EntityManagerInterface $em): JsonResponse
    {
        $reservation->setStatus('cancelled');
        $em->flush();

        $dateTime = new \DateTime(
            $reservation->getDate()->format('Y-m-d') . ' ' . $reservation->getTime()->format('H:i:s')
        );

        $data = [
            'id'      => $reservation->getId(),
            'name'    => $reservation->getName(),
            'email'   => $reservation->getEmail(),
            'date'    => $dateTime->format(\DateTimeInterface::ATOM),
            'service' => $reservation->getService(),
            'status'  => $reservation->getStatus(),
        ];

        return new JsonResponse($data);
    }
}

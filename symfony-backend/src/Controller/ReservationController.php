<?php
namespace App\Controller;

use App\Entity\Reservation;
use App\Repository\ReservationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use DateTime;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpKernel\KernelInterface;

class ReservationController extends AbstractController
{
    private EntityManagerInterface $em;
    private ReservationRepository $repo;
    private string $uploadsDir;

    public function __construct(EntityManagerInterface $em, ReservationRepository $repo, KernelInterface $kernel)
    {
        $this->em = $em;
        $this->repo = $repo;
        $this->uploadsDir = $kernel->getProjectDir() . '/public/uploads/reservations';
    }


    #[Route('/api/reservations', name: 'api_reservations_create', methods: ['POST'])]
    public function create(Request $req): JsonResponse
    {
        $service = $req->request->get('service');
        $dateStr = $req->request->get('date');
        $time = $req->request->get('time');
        $name = $req->request->get('name');
        $email = $req->request->get('email');
        $phone = $req->request->get('phone');

        if (!$service || !$dateStr || !$time || !$name || !$email) {
            return new JsonResponse(['message' => 'Faltan campos obligatorios'], 400);
        }

        try {
            $date = new DateTime($dateStr);
        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Formato de fecha inválido'], 400);
        }

        $durations = ['standard' => 60, 'large' => 180];
        $duration = $durations[$service] ?? 60;
        $buffer = 15;

        // reglas: antelación 24h, max 90 días
        $now = new DateTime();
        $minAllowed = (clone $now)->modify('+24 hours');
        $maxAllowed = (clone $now)->modify('+90 days');

        // slotDateTime combina fecha + hora para comparaciones correctas
        try {
            $slotDateTime = new DateTime($date->format('Y-m-d') . ' ' . $time);
        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Formato de hora inválido'], 400);
        }

        if ($slotDateTime < $minAllowed) {
            return new JsonResponse(['message' => 'Debe reservar con al menos 24 horas de antelación'], 400);
        }
        if ($slotDateTime > $maxAllowed) {
            return new JsonResponse(['message' => 'Fecha máxima permitida superada'], 400);
        }

        // horario válido (copiar lógica de availability)
        $dow = (int)$date->format('N'); // 1..7 (7 = domingo)
        if ($dow == 7) {
            return new JsonResponse(['message' => 'Domingo no disponible'], 400);
        }
        if ($dow == 6 && $service !== 'large') {
            return new JsonResponse(['message' => 'Sábados solo piezas grandes'], 400);
        }

        if (!$this->repo->isSlotFree($date, $time, $duration, $buffer)) {
            return new JsonResponse(['message' => 'El slot no está disponible'], 409);
        }

        // handle file upload
        $referencePath = null;
        $file = $req->files->get('reference');
        if ($file) {
            $fs = new Filesystem();
            $uploadsDir = $this->uploadsDir;
            if (!$fs->exists($uploadsDir)) {
                $fs->mkdir($uploadsDir, 0755);
            }

            // intento de obtener extensión segura; fallback a 'bin'
            $ext = $file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'bin';
            $filename = uniqid('ref_', true) . '.' . $ext;

            try {
                $file->move($uploadsDir, $filename);
                $referencePath = $filename;
            } catch (FileException $e) {
                // devuelve error 500 para que el cliente sepa que falló la subida
                return new JsonResponse(['message' => 'Error al subir el archivo de referencia'], 500);
            }
        }

        $reservation = new Reservation();
        $reservation->setService($service);
        $reservation->setDate($date);
        $reservation->setTime(new DateTime($time));
        $reservation->setDuration($duration);
        $reservation->setName($name);
        $reservation->setEmail($email);
        $reservation->setPhone($phone);
        $reservation->setReferencePath($referencePath);
        $reservation->setDeposit(20.0);
        $reservation->setDepositPaid(false);
        $reservation->setStatus('pending');
        $reservation->setCreatedAt(new DateTime());

        $this->em->persist($reservation);
        $this->em->flush();

        // Crear orden PayPal (Servicio PayPal separado) -> devolver URL
        $payUrl = null;
        // $payUrl = $this->paypalService->createOrder($reservation->getId(), 20.0, $returnUrl, $cancelUrl);

        return new JsonResponse(['reservationId' => $reservation->getId(), 'payUrl' => $payUrl], 201);
    }
}

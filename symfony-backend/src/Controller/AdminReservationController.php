<?php
// src/Controller/AdminReservationController.php
namespace App\Controller;

use App\Entity\Reservation;
use App\Repository\ReservationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpKernel\KernelInterface;

#[Route('/admin/reservations')]
class AdminReservationController extends AbstractController
{
    private EntityManagerInterface $em;
    private string $uploadsDir;
    private MailerInterface $mailer;
    private UrlGeneratorInterface $urlGenerator;

    public function __construct(EntityManagerInterface $em, KernelInterface $kernel, MailerInterface $mailer, UrlGeneratorInterface $urlGenerator)
    {
        $this->em = $em;
        $this->uploadsDir = $kernel->getProjectDir() . '/public/uploads/reservations';

        $this->mailer = $mailer;
        $this->urlGenerator = $urlGenerator;
    }

    #[Route('/', name: 'admin_reservations_list', methods: ['GET'])]
    public function list(ReservationRepository $repo): Response
    {
        $reservations = $repo->findBy([], ['createdAt' => 'DESC']);
        return $this->render('admin/reservations/list.html.twig', [
            'reservations' => $reservations
        ]);
    }

    #[Route('/{id}', name: 'admin_reservations_show', methods: ['GET'])]
    public function show(Reservation $reservation): Response
    {
        return $this->render('admin/reservations/show.html.twig', [
            'r' => $reservation
        ]);
    }

    #[Route('/{id}/approve', name: 'admin_reservations_approve', methods: ['POST'])]
    public function approve(Request $req, Reservation $reservation): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        if (!$this->isCsrfTokenValid('approve'.$reservation->getId(), $req->request->get('_token'))) {
            $this->addFlash('danger', 'Token CSRF inválido.');
            return $this->redirectToRoute('admin_reservations_show', ['id' => $reservation->getId()]);
        }

        $reservation->setStatus('approved');
        $this->em->flush();

        $icsUrl = $this->urlGenerator->generate('admin_reservation_ics', ['id' => $reservation->getId()], UrlGeneratorInterface::ABSOLUTE_URL);

        $email = (new TemplatedEmail())
            ->from('no-reply@tuestudio.com')
            ->to($reservation->getEmail())
            ->subject(sprintf('Tu cita en Eterna Aurea — %s %s', $reservation->getDate()->format('Y-m-d'), $reservation->getTime()->format('H:i')))
            ->htmlTemplate('emails/reservation_confirm.html.twig')
            ->context([
                'reservation' => $reservation,
                'icsUrl' => $icsUrl
            ]);

        $this->mailer->send($email);

        $this->addFlash('success', 'Reserva aprobada y email de confirmación enviado.');
        return $this->redirectToRoute('admin_reservations_show', ['id' => $reservation->getId()]);
    }

    #[Route('/{id}/reject', name: 'admin_reservations_reject', methods: ['POST'])]
    public function reject(Request $req, Reservation $reservation): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        if (!$this->isCsrfTokenValid('reject'.$reservation->getId(), $req->request->get('_token'))) {
            $this->addFlash('danger', 'Token CSRF inválido.');
            return $this->redirectToRoute('admin_reservations_show', ['id' => $reservation->getId()]);
        }

        $reservation->setStatus('rejected');
        $this->em->flush();

        $email = (new TemplatedEmail())
            ->from('no-reply@tuestudio.com')
            ->to($reservation->getEmail())
            ->subject('Reserva rechazada')
            ->htmlTemplate('emails/reservation_rejected.html.twig')
            ->context(['reservation' => $reservation]);

        $this->mailer->send($email);

        $this->addFlash('success', 'Reserva rechazada y usuario notificado.');
        return $this->redirectToRoute('admin_reservations_list');
    }

    #[Route('/{id}/download-reference', name: 'admin_reservations_download_reference', methods: ['GET'])]
    public function downloadReference(Reservation $reservation)
    {
        if (!$reservation->getReferencePath()) {
            $this->addFlash('warning', 'No hay archivo de referencia.');
            return $this->redirectToRoute('admin_reservations_show', ['id' => $reservation->getId()]);
        }

        $file = $this->uploadsDir . '/' . $reservation->getReferencePath();
        return new BinaryFileResponse($file);
    }

    #[Route('/{id}/calendar.ics', name: 'admin_reservation_ics', methods: ['GET'])]
    public function ics(Reservation $reservation)
    {
        $dtStart = new \DateTime($reservation->getDate()->format('Ymd').'T'.$reservation->getTime()->format('His'));
        $dtEnd = (clone $dtStart)->modify("+{$reservation->getDuration()} minutes");

        $uid = 'reservation-'.$reservation->getId().'@tuestudio.com';

        $content =
            "BEGIN:VCALENDAR\r\n".
            "VERSION:2.0\r\n".
            "PRODID:-//TuEstudio//Booking//ES\r\n".
            "BEGIN:VEVENT\r\n".
            "UID:{$uid}\r\n".
            "DTSTAMP:".gmdate('Ymd').'T'.gmdate('His')."Z\r\n".
            "DTSTART:".$dtStart->format('Ymd').'T'.$dtStart->format('His')."Z\r\n".
            "DTEND:".$dtEnd->format('Ymd').'T'.$dtEnd->format('His')."Z\r\n".
            "SUMMARY:Reserva - {$reservation->getService()}\r\n".
            "DESCRIPTION:Reserva en Eterna Aurea Tattoo Studio\r\n".
            "END:VEVENT\r\n".
            "END:VCALENDAR";

        return new Response($content, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename=reservation_'.$reservation->getId().'.ics'
        ]);
    }
}

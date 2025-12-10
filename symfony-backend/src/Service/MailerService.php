<?php
// symfony-backend/src/Service/MailerService.php
namespace App\Service;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Twig\Environment;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;

class MailerService
{
    private MailerInterface $mailer;
    private Environment $twig;
    private string $projectDir;
    private string $fromEmail;
    private string $fromName;
    private LoggerInterface $logger;

    public function __construct(
        MailerInterface $mailer,
        Environment $twig,
        KernelInterface $kernel,
        LoggerInterface $logger,
        string $fromEmail = 'tattooamuedoartist@gmail.com',
        string $fromName = 'Eterna Aurea Tattoo Studio'
    ) {
        $this->mailer   = $mailer;
        $this->twig     = $twig;
        $this->projectDir = $kernel->getProjectDir();
        $this->fromEmail  = $fromEmail;
        $this->fromName   = $fromName;
        $this->logger     = $logger;
    }

    public function sendReservationEmail(
        string $toEmail,
        string $name,
        string $date,
        string $time,
        string $service
    ): void {
        $this->logger->info('MailerService::sendReservationEmail called', [
            'to' => $toEmail,
            'name' => $name,
            'date' => $date,
            'time' => $time,
            'service' => $service,
        ]);

        try {
            $html = $this->twig->render('email/reserva_confirmada.html.twig', [
                'name'      => $name,
                'date'      => $date,
                'time'      => $time,
                'service'   => $service,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('MailerService: fallo al renderizar twig', ['exception' => $e->getMessage()]);
            throw $e;
        }

        $email = (new Email())
            ->from(new Address($this->fromEmail, $this->fromName))
            ->to($toEmail)
            ->subject(sprintf('Confirmación de reserva — %s %s', $date, $time))
            ->html($html)
            ->text($this->generatePlainText($html));

        $this->logger->info('MailerService: about to send email', ['to' => $toEmail, 'subject' => $email->getSubject()]);

       try {
    $this->mailer->send(
        $email,
        new Envelope(
            new Address($this->fromEmail),     // MAIL FROM real
            [ new Address($toEmail) ]          // RCPT TO
        )
    );

    $this->logger->info('MailerService: email sent (no exception thrown)', ['to' => $toEmail]);

} catch (\Throwable $e) {

    $this->logger->error('MailerService: excepción al enviar email', [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'to' => $toEmail,
    ]);

    throw $e;
}

    }

    private function generatePlainText(string $html): string
    {
        $noScripts = preg_replace('#<script(.*?)>(.*?)</script>#is', '', $html);
        $noStyles  = preg_replace('#<style(.*?)>(.*?)</style>#is', '', $noScripts);
        $breaks = preg_replace('#<(br|/p|/div|/h[1-6])[^>]*>#i', "\n", $noStyles);
        $text = strip_tags($breaks);
        $text = preg_replace("/\n{2,}/", "\n\n", $text);
        return trim($text);
    }
}

<?php
// src/Entity/Reservation.php
namespace App\Entity;

use App\Repository\ReservationRepository;
use DateTimeInterface;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReservationRepository::class)]
#[ORM\Table(name: 'reservations')]
#[ORM\Index(name: 'date_time_idx', columns: ['date', 'time'])]
class Reservation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 50)]
    private ?string $service = null;

    #[ORM\Column(type: 'date')]
    private ?DateTimeInterface $date = null;

    #[ORM\Column(type: 'time')]
    private ?DateTimeInterface $time = null;

    #[ORM\Column(type: 'integer')]
    private ?int $duration = null;

    #[ORM\Column(type: 'string', length: 255)]
    private ?string $name = null;

    #[ORM\Column(type: 'string', length: 255)]
    private ?string $email = null;

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $referencePath = null;

    #[ORM\Column(type: 'float')]
    private float $deposit = 0.0;

    #[ORM\Column(type: 'boolean')]
    private bool $depositPaid = false;

    #[ORM\Column(type: 'string', length: 20)]
    private string $status = 'pending';

    #[ORM\Column(type: 'datetime')]
    private ?DateTimeInterface $createdAt = null;

    #[ORM\Column(type: 'boolean')]
    private bool $sent24h = false;

    #[ORM\Column(type: 'boolean')]
    private bool $sent2h = false;

    // ---------------- Getters / Setters ----------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getService(): ?string
    {
        return $this->service;
    }

    public function setService(string $service): self
    {
        $this->service = $service;
        return $this;
    }

    public function getDate(): ?DateTimeInterface
    {
        return $this->date;
    }

    public function setDate(DateTimeInterface $date): self
    {
        $this->date = $date;
        return $this;
    }

    public function getTime(): ?DateTimeInterface
    {
        return $this->time;
    }

    public function setTime(DateTimeInterface $time): self
    {
        $this->time = $time;
        return $this;
    }

    public function getDuration(): ?int
    {
        return $this->duration;
    }

    public function setDuration(int $duration): self
    {
        $this->duration = $duration;
        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): self
    {
        $this->phone = $phone;
        return $this;
    }

    public function getReferencePath(): ?string
    {
        return $this->referencePath;
    }

    public function setReferencePath(?string $referencePath): self
    {
        $this->referencePath = $referencePath;
        return $this;
    }

    public function getDeposit(): float
    {
        return $this->deposit;
    }

    public function setDeposit(float $deposit): self
    {
        $this->deposit = $deposit;
        return $this;
    }

    public function isDepositPaid(): bool
    {
        return $this->depositPaid;
    }

    public function setDepositPaid(bool $depositPaid): self
    {
        $this->depositPaid = $depositPaid;
        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getCreatedAt(): ?DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function isSent24h(): bool
    {
        return $this->sent24h;
    }

    public function setSent24h(bool $sent24h): self
    {
        $this->sent24h = $sent24h;
        return $this;
    }

    public function isSent2h(): bool
    {
        return $this->sent2h;
    }

    public function setSent2h(bool $sent2h): self
    {
        $this->sent2h = $sent2h;
        return $this;
    }
}

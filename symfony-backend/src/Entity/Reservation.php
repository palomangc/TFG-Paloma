<?php
// src/Entity/Reservation.php
namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass="App\Repository\ReservationRepository")
 * @ORM\Table(name="reservations", indexes={@ORM\Index(columns={"date","time"})})
 */
class Reservation
{
    /** @ORM\Id @ORM\GeneratedValue @ORM\Column(type="integer") */
    private $id;

    /** @ORM\Column(type="string", length=50) */
    private $service;

    /** @ORM\Column(type="date") */
    private $date;

    /** @ORM\Column(type="time") */
    private $time;

    /** @ORM\Column(type="integer") */
    private $duration; // minutos

    /** @ORM\Column(type="string", length=255) */
    private $name;

    /** @ORM\Column(type="string", length=255) */
    private $email;

    /** @ORM\Column(type="string", length=50, nullable=true) */
    private $phone;

    /** @ORM\Column(type="string", length=255, nullable=true) */
    private $referencePath;

    /** @ORM\Column(type="float") */
    private $deposit = 0.0;

    /** @ORM\Column(type="boolean") */
    private $depositPaid = false;

    /** @ORM\Column(type="string", length=20) */
    private $status = 'pending'; // pending, approved, rejected

    /** @ORM\Column(type="datetime") */
    private $createdAt;

    /** @ORM\Column(type="boolean") */
    private $sent24h = false;

    /** @ORM\Column(type="boolean") */
    private $sent2h = false;

    // getters & setters (generate with maker:entity or manually)
    // ...
}

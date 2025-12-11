<?php
// src/Controller/Api/PortfolioController.php
namespace App\Controller\Api;

use App\Entity\PortfolioItem;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\String\Slugger\SluggerInterface;
use Symfony\Component\HttpKernel\KernelInterface;

#[Route('/api/admin/portfolio', name: 'api_admin_portfolio_')]
class PortfolioController extends AbstractController
{
    private string $uploadRel = '/uploads/portfolio';
    private string $uploadDir;
    private EntityManagerInterface $em;
    private SluggerInterface $slugger;

    public function __construct(KernelInterface $kernel, EntityManagerInterface $em, SluggerInterface $slugger)
    {
        $projectDir = $kernel->getProjectDir();
        $this->uploadDir = rtrim($projectDir, '/') . '/public' . $this->uploadRel;
        $this->em = $em;
        $this->slugger = $slugger;

        if (!is_dir($this->uploadDir)) {
            @mkdir($this->uploadDir, 0755, true);
        }
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $title = $request->request->get('title', null);
        $description = $request->request->get('description', null);
        $position = (int) $request->request->get('position', 0);

        $file = $request->files->get('image'); // clave 'image'
        if (!$file) {
            return $this->json(['error' => 'no_image_provided'], Response::HTTP_BAD_REQUEST);
        }

        $original = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safe = $this->slugger->slug($original)->lower();
        $newName = $safe . '-' . uniqid() . '.' . $file->guessExtension();

        if (!is_dir($this->uploadDir)) {
            if (!@mkdir($this->uploadDir, 0755, true) && !is_dir($this->uploadDir)) {
                return $this->json(['error' => 'mkdir_failed', 'msg' => 'No se pudo crear upload dir'], 500);
            }
        }

        try {
            $file->move($this->uploadDir, $newName);
        } catch (\Throwable $e) {
            return $this->json(['error' => 'upload_failed', 'msg' => $e->getMessage()], 500);
        }

        $item = new PortfolioItem();
        $item->setImage($newName);
        $item->setTitle($title);
        $item->setDescription($description);
        $item->setPosition($position);
        $item->setUpdatedAt(new \DateTimeImmutable());
        if (method_exists($item, 'setCreatedAt') && !$item->getCreatedAt()) {
            $item->setCreatedAt(new \DateTimeImmutable());
        }

        try {
            $this->em->persist($item);
            $this->em->flush();
        } catch (\Throwable $e) {
            @unlink($this->uploadDir . '/' . $newName);
            return $this->json(['error' => 'db_error', 'msg' => $e->getMessage()], 500);
        }

        $response = [
            'id' => $item->getId(),
            'file' => $newName,
            'image' => $this->uploadRel . '/' . $newName,
            'title' => $item->getTitle(),
            'description' => $item->getDescription(),
            'position' => $item->getPosition(),
            'createdAt' => $item->getCreatedAt() ? $item->getCreatedAt()->format(\DateTime::ATOM) : null,
            'updatedAt' => $item->getUpdatedAt() ? $item->getUpdatedAt()->format(\DateTime::ATOM) : null,
        ];

        return $this->json($response, Response::HTTP_CREATED);
    }

#[Route('', name: 'list', methods: ['GET'])]
public function list(): JsonResponse
{
    $repo = $this->em->getRepository(PortfolioItem::class);
    $items = $repo->findBy([], ['position' => 'ASC']);

    $data = array_map(function (PortfolioItem $i) {
        return [
            'id' => $i->getId(),
            'file' => $i->getImage(),
            'image' => $this->uploadRel . '/' . $i->getImage(),
            'title' => $i->getTitle(),
            'description' => $i->getDescription(),
            'position' => $i->getPosition(),
            'createdAt' => $i->getCreatedAt() ? $i->getCreatedAt()->format(\DateTime::ATOM) : null,
            'updatedAt' => $i->getUpdatedAt() ? $i->getUpdatedAt()->format(\DateTime::ATOM) : null,
        ];
    }, $items);

    return $this->json($data);
}

#[Route('/upload', name: 'upload', methods: ['POST'])]
public function upload(Request $request): JsonResponse
{
    $file = $request->files->get('file');
    if (!$file) {
        return $this->json(['error' => 'no_file'], Response::HTTP_BAD_REQUEST);
    }

    // asegurar directorio
    if (!is_dir($this->uploadDir) && !@mkdir($this->uploadDir, 0755, true)) {
        return $this->json(['error' => 'mkdir_failed'], 500);
    }

    $original = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
    $safe = $this->slugger->slug($original)->lower();
    $ext = $file->guessExtension() ?: $file->getClientOriginalExtension();
    $newName = $safe . '-' . uniqid() . '.' . $ext;

    try {
        $file->move($this->uploadDir, $newName);
    } catch (\Throwable $e) {
        return $this->json(['error' => 'upload_failed', 'msg' => $e->getMessage()], 500);
    }

    return $this->json([
        'filename' => $newName,
        'url' => $this->uploadRel . '/' . $newName,
    ]);
}


    #[Route('/{id}', name: 'update', methods: ['POST','PUT','PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $item = $this->em->getRepository(PortfolioItem::class)->find($id);
        if (!$item) {
            return $this->json(['error' => 'not_found'], Response::HTTP_NOT_FOUND);
        }

        $title = $request->request->get('title', $item->getTitle());
        $description = $request->request->get('description', $item->getDescription());
        $position = (int) $request->request->get('position', $item->getPosition());

        $file = $request->files->get('image'); // opcional
        $newName = null;
        if ($file) {
            $original = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $safe = $this->slugger->slug($original)->lower();
            $newName = $safe . '-' . uniqid() . '.' . $file->guessExtension();

            if (!is_dir($this->uploadDir)) {
                if (!@mkdir($this->uploadDir, 0755, true) && !is_dir($this->uploadDir)) {
                    return $this->json(['error' => 'mkdir_failed', 'msg' => 'No se pudo crear upload dir'], 500);
                }
            }

            try {
                $file->move($this->uploadDir, $newName);
            } catch (\Throwable $e) {
                return $this->json(['error' => 'upload_failed', 'msg' => $e->getMessage()], 500);
            }
        }

        if ($newName) {
            $old = $item->getImage();
            if ($old && file_exists($this->uploadDir . '/' . $old)) {
                @unlink($this->uploadDir . '/' . $old);
            }
            $item->setImage($newName);
        }

        $item->setTitle($title);
        $item->setDescription($description);
        $item->setPosition($position);
        $item->setUpdatedAt(new \DateTimeImmutable());

        try {
            $this->em->persist($item);
            $this->em->flush();
        } catch (\Throwable $e) {
            if ($newName) @unlink($this->uploadDir . '/' . $newName);
            return $this->json(['error' => 'db_error', 'msg' => $e->getMessage()], 500);
        }

        $response = [
            'id' => $item->getId(),
            'file' => $item->getImage(),
            'image' => $this->uploadRel . '/' . $item->getImage(),
            'title' => $item->getTitle(),
            'description' => $item->getDescription(),
            'position' => $item->getPosition(),
            'createdAt' => $item->getCreatedAt() ? $item->getCreatedAt()->format(\DateTime::ATOM) : null,
            'updatedAt' => $item->getUpdatedAt() ? $item->getUpdatedAt()->format(\DateTime::ATOM) : null,
        ];

        return $this->json($response, Response::HTTP_OK);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $item = $this->em->getRepository(PortfolioItem::class)->find($id);
        if (!$item) {
            return $this->json(['error' => 'not_found'], Response::HTTP_NOT_FOUND);
        }

        $file = $item->getImage();
        try {
            $this->em->remove($item);
            $this->em->flush();
            if ($file && file_exists($this->uploadDir . '/' . $file)) {
                @unlink($this->uploadDir . '/' . $file);
            }
        } catch (\Throwable $e) {
            return $this->json(['error' => 'db_error', 'msg' => $e->getMessage()], 500);
        }

        return $this->json(['ok' => true], Response::HTTP_OK);
    }
}

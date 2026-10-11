import { Router } from 'express';
const router = Router();

// List students – returns a simple array
router.get('/', (req, res) => {
  const mock = [
    {
      id: 1,
      first_name: 'សូត្រ',
      last_name: 'សេដ្ឋា',
      student_code: '2023001',
      class_name: '10A',
    },
    {
      id: 2,
      first_name: 'វណ្ណ',
      last_name: 'ច័ន្ទ',
      student_code: '2023002',
      class_name: '10B',
    },
  ];
  res.json({ items: mock });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id: Number(id),
    first_name: 'សូត្រ',
    last_name: 'សេដ្ឋា',
    student_code: '2023001',
    class_name: '10A',
  });
});

router.post('/', (req, res) => {
  // Echo back created student with a generated id
  res.json({ id: 3, ...req.body });
});

router.put('/:id', (req, res) => {
  res.json({ id: Number(req.params.id), ...req.body });
});

router.delete('/:id', (req, res) => {
  res.sendStatus(204);
});

// Photo upload (mock)
router.post('/:id/photo', (req, res) => {
  // ignore the multipart data – return placeholder URL
  res.json({ url: '/placeholder-photo.png' });
});

router.get('/:id/photo', (req, res) => {
  // Return a 1x1 PNG data URL
  const img = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AArEB5ZmmrwAAAABJRU5ErkJggg==',
    'base64'
  );
  res.set('Content-Type', 'image/png');
  res.send(img);
});

export default router;

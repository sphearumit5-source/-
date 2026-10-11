import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json([
    { id: 1, class_name: '10A', grade: 10, section: 'A', academic_year: 2023 },
    { id: 2, class_name: '10B', grade: 10, section: 'B', academic_year: 2023 },
  ]);
});

router.post('/', (req, res) => {
  res.json({ id: 3, ...req.body });
});

router.put('/:id', (req, res) => {
  res.json({ id: Number(req.params.id), ...req.body });
});

router.delete('/:id', (req, res) => {
  res.sendStatus(204);
});

export default router;

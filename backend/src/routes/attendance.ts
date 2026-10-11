import { Router } from 'express';
const router = Router();

// Detect face – used by auto‑scan
router.post('/face/detect', (req, res) => {
  // Simple mock response – always ready and centered
  res.json({
    face_count: 1,
    ready: true,
    centered: true,
    guidance: 'មុខស្ថិតចំកណ្តាល',
  });
});

// Register face – enrollment endpoint
router.post('/face/register', (req, res) => {
  // In a real implementation you would store the image + associate with studentId
  res.json({ message: 'បានចុះឈ្មោះមុខជោគជ័យ!', student_id: 1 });
});

// Recognize face – attendance check
router.post('/face/recognize', (req, res) => {
  // Mock successful recognition result
  const mock = {
    message: '',
    student_id: 1,
    student_code: '2023001',
    student_name: 'សិស្ស កែវ',
    class_name: '10A',
    check_in_time: new Date().toISOString(),
    status: 'present' as const,
    similarity: 0.97,
  };
  res.json(mock);
});

export default router;

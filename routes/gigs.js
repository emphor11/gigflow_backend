const express = require('express');
const {
  createGig,
  getGigs,
  getGigById,
  getMyGigs,
  updateGig,
  deleteGig
} = require('../controllers/gigController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', getGigs);
router.get('/my', protect, getMyGigs);
router.get('/:id', getGigById);

router.post('/', protect, createGig);
router.put('/:id', protect, updateGig);
router.delete('/:id', protect, deleteGig);

module.exports = router;

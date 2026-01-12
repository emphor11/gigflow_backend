const Gig = require('../models/Gig');

/**
 * @desc    Create a gig
 * @route   POST /api/gigs
 * @access  Private
 */
const createGig = async (req, res) => {
  try {
    const { title, description, budget } = req.body;

    if (!title || !description || !budget) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all fields'
      });
    }

    const gig = await Gig.create({
      title,
      description,
      budget,
      ownerId: req.user._id
    });

    const populatedGig = await Gig.findById(gig._id)
      .populate('ownerId', 'name email');

    res.status(201).json({
      success: true,
      gig: populatedGig
    });
  } catch (error) {
    console.error('Create gig error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating gig'
    });
  }
};

/**
 * @desc    Get all open gigs (with search)
 * @route   GET /api/gigs
 * @access  Public
 */
const getGigs = async (req, res) => {
  try {
    const { search } = req.query;

    let query = { status: 'open' };
    
    // Handle search query - use regex for case-insensitive search
    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const gigs = await Gig.find(query)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: gigs.length,
      gigs
    });
  } catch (error) {
    console.error('Get gigs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching gigs'
    });
  }
};

/**
 * @desc    Get single gig by ID
 * @route   GET /api/gigs/:id
 * @access  Public
 */
const getGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate('ownerId', 'name email');

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }

    res.status(200).json({
      success: true,
      gig
    });
  } catch (error) {
    console.error('Get gig by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error fetching gig'
    });
  }
};

/**
 * @desc    Get logged-in user's gigs
 * @route   GET /api/gigs/my
 * @access  Private
 */
const getMyGigs = async (req, res) => {
  try {
    const gigs = await Gig.find({ ownerId: req.user._id })
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: gigs.length,
      gigs
    });
  } catch (error) {
    console.error('Get my gigs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your gigs'
    });
  }
};

/**
 * @desc    Update gig (owner only, open gigs only)
 * @route   PUT /api/gigs/:id
 * @access  Private
 */
const updateGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }

    if (gig.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (gig.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Assigned gigs cannot be updated'
      });
    }

    const { title, description, budget } = req.body;

    if (title) gig.title = title;
    if (description) gig.description = description;
    if (budget) gig.budget = budget;

    await gig.save();

    const updatedGig = await Gig.findById(gig._id)
      .populate('ownerId', 'name email');

    res.status(200).json({
      success: true,
      gig: updatedGig
    });
  } catch (error) {
    console.error('Update gig error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating gig'
    });
  }
};

/**
 * @desc    Delete gig (owner only, open gigs only)
 * @route   DELETE /api/gigs/:id
 * @access  Private
 */
const deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }

    if (gig.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (gig.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Assigned gigs cannot be deleted'
      });
    }

    await gig.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Gig deleted successfully'
    });
  } catch (error) {
    console.error('Delete gig error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting gig'
    });
  }
};

module.exports = {
  createGig,
  getGigs,
  getGigById,
  getMyGigs,
  updateGig,
  deleteGig
};

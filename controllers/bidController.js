// server/controllers/bidController.js
const Bid = require('../models/Bid');
const Gig = require('../models/Gig');
const mongoose = require('mongoose');

// @desc    Submit a bid
// @route   POST /api/bids
// @access  Private
const createBid = async (req, res) => {
  try {
    const { gigId, message, price } = req.body;
    
    // Validation
    if (!gigId || !message || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all fields' 
      });
    }
    
    // Check if gig exists and is open
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gig not found' 
      });
    }
    
    if (gig.status !== 'open') {
      return res.status(400).json({ 
        success: false, 
        message: 'This gig is no longer accepting bids' 
      });
    }
    
    // Prevent owner from bidding on own gig
    if (gig.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot bid on your own gig' 
      });
    }
    
    // Check for existing bid
    const existingBid = await Bid.findOne({ 
      gigId, 
      freelancerId: req.user._id 
    });
    
    if (existingBid) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted a bid for this gig' 
      });
    }
    
    // Create bid
    const bid = await Bid.create({
      gigId,
      freelancerId: req.user._id,
      message,
      price
    });
    
    const populatedBid = await Bid.findById(bid._id)
      .populate('freelancerId', 'name email')
      .populate('gigId', 'title');
    
    res.status(201).json({
      success: true,
      bid: populatedBid
    });
  } catch (error) {
    console.error('Create bid error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted a bid for this gig' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating bid' 
    });
  }
};

// @desc    Get all bids for a gig (Owner only)
// @route   GET /api/bids/:gigId
// @access  Private
const getBidsForGig = async (req, res) => {
  try {
    const { gigId } = req.params;
    
    // Check if gig exists
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gig not found' 
      });
    }
    
    // Check ownership
    if (gig.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view bids for this gig' 
      });
    }
    
    const bids = await Bid.find({ gigId })
      .populate('freelancerId', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: bids.length,
      bids
    });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching bids' 
    });
  }
};

// @desc    Get user's bids
// @route   GET /api/bids/my-bids
// @access  Private
const getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ freelancerId: req.user._id })
      .populate('gigId', 'title description budget status')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: bids.length,
      bids
    });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching your bids' 
    });
  }
};

// @desc    Hire a freelancer (CRITICAL HIRING LOGIC)
// @route   PATCH /api/bids/:bidId/hire
// @access  Private
const hireBid = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Find the bid
    const bid = await Bid.findById(req.params.bidId)
      .populate('gigId')
      .session(session);
    
    if (!bid) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: 'Bid not found' 
      });
    }
    
    const gig = bid.gigId;
    
    // Check if user is the gig owner
    if (gig.ownerId.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to hire for this gig' 
      });
    }
    
    // Check if gig is still open
    if (gig.status !== 'open') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: 'This gig has already been assigned' 
      });
    }
    
    // ATOMIC OPERATIONS:
    // 1. Update the gig status to assigned
    await Gig.findByIdAndUpdate(
      gig._id,
      { status: 'assigned' },
      { session }
    );
    
    // 2. Mark the chosen bid as hired
    await Bid.findByIdAndUpdate(
      bid._id,
      { status: 'hired' },
      { session }
    );
    
    // 3. Mark all other bids for this gig as rejected
    await Bid.updateMany(
      { 
        gigId: gig._id, 
        _id: { $ne: bid._id } 
      },
      { status: 'rejected' },
      { session }
    );
    
    await session.commitTransaction();
    
    // Fetch updated bid with populated data
    const updatedBid = await Bid.findById(bid._id)
      .populate('freelancerId', 'name email')
      .populate('gigId', 'title description budget status');
    
    // Get Socket.io instance and emit real-time notification to freelancer
    const io = req.app.get('io');
    if (io) {
      const freelancerId = bid.freelancerId.toString();
      const projectName = gig.title;
      
      io.to(`user_${freelancerId}`).emit('hired', {
        message: `You have been hired for ${projectName}!`,
        gigId: gig._id.toString(),
        gigTitle: projectName,
        bidId: bid._id.toString()
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Freelancer hired successfully',
      bid: updatedBid
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Hire bid error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error hiring freelancer' 
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createBid,
  getBidsForGig,
  getMyBids,
  hireBid
};
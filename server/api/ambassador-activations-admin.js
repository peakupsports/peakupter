const { listAmbassadorActivations } = require('../api-util/ambassadorActivationStore');
const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');

const router = require('express').Router();

router.get('/', requireCoachApplicationAdmin, (req, res) => {
  try {
    const activations = listAmbassadorActivations();
    res.status(200).json({ activations });
  } catch (error) {
    console.error('[ambassador-activations] list failed:', error);
    res.status(500).json({ message: error.message || 'Failed to list ambassador activations' });
  }
});

module.exports = router;

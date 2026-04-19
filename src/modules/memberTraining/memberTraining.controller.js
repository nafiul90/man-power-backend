const service = require('./memberTraining.service');
const { sendSuccess } = require('../../utils/response');

const getByGroupTraining = async (req, res, next) => {
  try {
    const result = await service.getByGroupTraining(req.params.groupTrainingId, req.user);
    sendSuccess(res, 200, 'Member trainings fetched.', result);
  } catch (err) { next(err); }
};

const getByMember = async (req, res, next) => {
  try {
    const result = await service.getByMember(req.params.memberId, req.user);
    sendSuccess(res, 200, 'Member training history fetched.', result);
  } catch (err) { next(err); }
};

const rate = async (req, res, next) => {
  try {
    const result = await service.rate(req.params.id, req.user, req.body);
    sendSuccess(res, 200, 'Rating updated.', result);
  } catch (err) { next(err); }
};

module.exports = { getByGroupTraining, getByMember, rate };

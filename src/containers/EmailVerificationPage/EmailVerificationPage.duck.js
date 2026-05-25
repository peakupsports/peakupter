import { parse } from '../../util/urlHelpers';
import { verify } from '../../ducks/emailVerification.duck';

// ================ Load data ================ //

export const loadData = (params, search) => {
  const urlParams = parse(search);
  const verificationToken = urlParams.t;
  const token = verificationToken ? `${verificationToken}` : null;

  if (!token) {
    return Promise.resolve();
  }

  // eslint-disable-next-line no-console
  console.log('[PeakUp Verify Token Found]', { tokenLength: token.length });

  return verify(token);
};

import { getProcess, TX_TRANSITION_ACTOR_CUSTOMER } from '../transactions/transaction';
import { createTransaction, createTxTransition } from './testData';
import {
  containsContactInfo,
  createContactSharingBlockedError,
  isContactSharingAllowed,
  isContactSharingBlockedError,
  normalizeMessageForContactDetection,
  shouldBlockContactSharingInMessage,
} from './peakupContactSharing';

describe('normalizeMessageForContactDetection', () => {
  it('removes spaces and common phone separators', () => {
    expect(normalizeMessageForContactDetection('+41 79 409 85 88')).toBe('+41794098588');
    expect(normalizeMessageForContactDetection('079 409 85 88')).toBe('0794098588');
    expect(normalizeMessageForContactDetection('079-409-85-88')).toBe('0794098588');
    expect(normalizeMessageForContactDetection('079.409.85.88')).toBe('0794098588');
    expect(normalizeMessageForContactDetection('(079) 409 85 88')).toBe('0794098588');
    expect(normalizeMessageForContactDetection('0 7 9 4 0 9 8 5 8 8')).toBe('0794098588');
  });
});

describe('containsContactInfo', () => {
  it('detects phone numbers with grouping', () => {
    expect(containsContactInfo('call me at +41 79 123 45 67')).toBe(true);
    expect(containsContactInfo('my number is 079 123 45 67')).toBe(true);
    expect(containsContactInfo('+41 79 409 85 88')).toBe(true);
    expect(containsContactInfo('079-409-85-88')).toBe(true);
    expect(containsContactInfo('(079) 409 85 88')).toBe(true);
  });

  it('detects spaced single-digit bypass attempts', () => {
    expect(containsContactInfo('0 7 9 4 0 9 8 5 8 8')).toBe(true);
  });

  it('detects emails', () => {
    expect(containsContactInfo('reach me at coach@peakup.test')).toBe(true);
  });

  it('detects messaging apps', () => {
    expect(containsContactInfo('message me on whatsapp')).toBe(true);
    expect(containsContactInfo('find me on telegram')).toBe(true);
    expect(containsContactInfo('my ig is @coachpeakup')).toBe(true);
  });

  it('detects phone keywords without a full number', () => {
    expect(containsContactInfo('call me when you are free')).toBe(true);
    expect(containsContactInfo('text me later')).toBe(true);
  });

  it('does not flag normal scheduling copy or small counts', () => {
    expect(containsContactInfo('see you tomorrow at 3pm')).toBe(false);
    expect(containsContactInfo('we are 4 people')).toBe(false);
    expect(containsContactInfo('I have 2 kids and 3 snowboards')).toBe(false);
  });
});

describe('isContactSharingAllowed', () => {
  it('blocks default-inquiry conversations', () => {
    const tx = createTransaction({
      processName: 'default-inquiry/release-1',
      lastTransition: 'transition/inquire-without-payment',
    });
    expect(isContactSharingAllowed(tx)).toBe(false);
  });

  it('blocks booking inquiry state', () => {
    const process = getProcess('default-booking');
    const tx = createTransaction({
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.INQUIRE,
      transitions: [
        createTxTransition({
          by: TX_TRANSITION_ACTOR_CUSTOMER,
          transition: process.transitions.INQUIRE,
        }),
      ],
    });
    expect(isContactSharingAllowed(tx)).toBe(false);
  });

  it('allows booking after payment request', () => {
    const process = getProcess('default-booking');
    const tx = createTransaction({
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT,
    });
    expect(isContactSharingAllowed(tx)).toBe(true);
  });
});

describe('shouldBlockContactSharingInMessage', () => {
  it('blocks contact in pre-booking chat', () => {
    const process = getProcess('default-booking');
    const tx = createTransaction({
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.INQUIRE,
      transitions: [
        createTxTransition({
          by: TX_TRANSITION_ACTOR_CUSTOMER,
          transition: process.transitions.INQUIRE,
        }),
      ],
    });
    expect(shouldBlockContactSharingInMessage(tx, 'email me at coach@peakup.test')).toBe(true);
    expect(shouldBlockContactSharingInMessage(tx, '0 7 9 4 0 9 8 5 8 8')).toBe(true);
  });

  it('allows contact after booking request', () => {
    const process = getProcess('default-booking');
    const tx = createTransaction({
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT,
    });
    expect(shouldBlockContactSharingInMessage(tx, 'call me at +41 79 123 45 67')).toBe(false);
    expect(shouldBlockContactSharingInMessage(tx, '0 7 9 4 0 9 8 5 8 8')).toBe(false);
  });
});

describe('createContactSharingBlockedError', () => {
  it('uses a stable error name for UI handling', () => {
    const error = createContactSharingBlockedError();
    expect(isContactSharingBlockedError(error)).toBe(true);
  });
});

import React, { useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import { useSelector } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { isTeamProviderProfileUserType } from '../../util/peakupTeam';
import { submitTeamApplication } from '../../util/api';

import { Page, Button, FieldTextInput, NamedLink } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './TeamApplicationPage.module.css';

const TeamApplicationPage = () => {
  const intl = useIntl();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const currentUser = useSelector(state => state.user.currentUser);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  if (isTeamProviderProfileUserType(currentUser)) {
    return (
      <Page scrollingDisabled={scrollingDisabled}>
        <TopbarContainer />
        <div className={css.root}>
          <p>
            <FormattedMessage id="TeamApplicationPage.alreadyTeam" />
          </p>
          <NamedLink name="ProfileSettingsPage">
            <FormattedMessage id="TeamApplicationPage.editProfile" />
          </NamedLink>
        </div>
        <FooterContainer />
      </Page>
    );
  }

  const onSubmit = async values => {
    setError(null);
    try {
      await submitTeamApplication({
        teamName: values.teamName,
        mainSport: values.mainSport,
        cityArea: values.cityArea,
        teamBio: values.teamBio,
        teamWebsite: values.teamWebsite,
        teamInstagram: values.teamInstagram,
        teamSports: values.mainSport ? [values.mainSport] : [],
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Submission failed');
    }
  };

  return (
    <Page
      scrollingDisabled={scrollingDisabled}
      title={intl.formatMessage({ id: 'TeamApplicationPage.title' })}
    >
      <TopbarContainer />
      <div className={css.root}>
        {submitted ? (
          <div className={css.success}>
            <h1 className={css.successTitle}>
              <FormattedMessage id="TeamApplicationPage.successTitle" />
            </h1>
            <p className={css.successBody}>
              <FormattedMessage id="TeamApplicationPage.successBody" />
            </p>
          </div>
        ) : (
          <>
            <h1 className={css.pageTitle}>
              <FormattedMessage id="TeamApplicationPage.title" />
            </h1>
            <p className={css.lead}>
              <FormattedMessage id="TeamApplicationPage.lead" />
            </p>
            <p className={css.leadNote}>
              <FormattedMessage id="TeamApplicationPage.leadNote" />
            </p>
            <FinalForm
              onSubmit={onSubmit}
              render={({ handleSubmit, submitting }) => (
                <form className={css.form} onSubmit={handleSubmit}>
                  <FieldTextInput
                    id="teamName"
                    name="teamName"
                    type="text"
                    label={intl.formatMessage({ id: 'TeamApplicationPage.teamName' })}
                    validate={v => (v?.trim() ? undefined : 'required')}
                  />
                  <FieldTextInput
                    id="mainSport"
                    name="mainSport"
                    type="text"
                    label={intl.formatMessage({ id: 'TeamApplicationPage.mainSport' })}
                    validate={v => (v?.trim() ? undefined : 'required')}
                  />
                  <FieldTextInput
                    id="cityArea"
                    name="cityArea"
                    type="text"
                    label={intl.formatMessage({ id: 'TeamApplicationPage.cityArea' })}
                  />
                  <FieldTextInput
                    id="teamBio"
                    name="teamBio"
                    type="textarea"
                    label={intl.formatMessage({ id: 'TeamApplicationPage.teamBio' })}
                  />
                  <FieldTextInput
                    id="teamWebsite"
                    name="teamWebsite"
                    type="text"
                    label={intl.formatMessage({ id: 'TeamApplicationPage.teamWebsite' })}
                  />
                  <FieldTextInput
                    id="teamInstagram"
                    name="teamInstagram"
                    type="text"
                    label={intl.formatMessage({ id: 'TeamApplicationPage.teamInstagram' })}
                  />
                  {error ? <p className={css.error}>{error}</p> : null}
                  <Button type="submit" inProgress={submitting}>
                    <FormattedMessage id="TeamApplicationPage.submit" />
                  </Button>
                </form>
              )}
            />
          </>
        )}
      </div>
      <FooterContainer />
    </Page>
  );
};

export default TeamApplicationPage;

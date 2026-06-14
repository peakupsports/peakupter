/**
 * One-off generator for CoachDirectory sport page copy.
 * Run: node scripts/generateCoachDirectoryTranslations.js
 */
const fs = require('fs');
const path = require('path');

const SPORT_KEYS = [
  'ski',
  'snowboard',
  'surf',
  'mtb',
  'tennis',
  'golf',
  'yoga',
  'climbing',
  'skydive',
  'kitesurf',
  'wakeboard',
  'wakesurf',
  'crosscountry',
  'fitness',
  'skateboard',
  'swimming',
  'hiking',
];

const COPY_BY_LOCALE = {
  en: {
    noResults: 'No certified professionals match this sport yet.',
    sports: {
      ski: {
        heroTitle: 'Find certified ski instructors',
        heroSubtitle: 'Find the right certified ski instructor for your next experience.',
        schemaTitle: 'Ski instructors | {marketplaceName}',
        schemaDescription: 'Browse certified ski instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Ski instructors',
      },
      snowboard: {
        heroTitle: 'Find certified snowboard instructors',
        heroSubtitle: 'Find the right certified snowboard instructor for your next experience.',
        schemaTitle: 'Snowboard instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified snowboard instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Snowboard instructors',
      },
      surf: {
        heroTitle: 'Find certified surf instructors',
        heroSubtitle: 'Find the right certified surf instructor for your next experience.',
        schemaTitle: 'Surf instructors | {marketplaceName}',
        schemaDescription: 'Browse certified surf instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Surf instructors',
      },
      mtb: {
        heroTitle: 'Find certified MTB guides',
        heroSubtitle: 'Find the right certified MTB guide for your next experience.',
        schemaTitle: 'MTB guides | {marketplaceName}',
        schemaDescription: 'Browse certified MTB guides and book your next session on PeakUp.',
        heroBannerAriaLabel: 'MTB guides',
      },
      tennis: {
        heroTitle: 'Find certified tennis instructors',
        heroSubtitle: 'Find the right certified tennis instructor for your next experience.',
        schemaTitle: 'Tennis instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified tennis instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Tennis instructors',
      },
      golf: {
        heroTitle: 'Find certified golf professionals',
        heroSubtitle: 'Find the right certified golf professional for your next experience.',
        schemaTitle: 'Golf professionals | {marketplaceName}',
        schemaDescription:
          'Browse certified golf professionals and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Golf professionals',
      },
      yoga: {
        heroTitle: 'Find certified yoga instructors',
        heroSubtitle: 'Find the right certified yoga instructor for your next experience.',
        schemaTitle: 'Yoga instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified yoga instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Yoga instructors',
      },
      climbing: {
        heroTitle: 'Find certified climbing guides',
        heroSubtitle: 'Find the right certified climbing guide for your next experience.',
        schemaTitle: 'Climbing guides | {marketplaceName}',
        schemaDescription:
          'Browse certified climbing guides and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Climbing guides',
      },
      skydive: {
        heroTitle: 'Find certified skydiving instructors',
        heroSubtitle: 'Find the right certified skydiving instructor for your next experience.',
        schemaTitle: 'Skydiving instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified skydiving instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Skydiving instructors',
      },
      kitesurf: {
        heroTitle: 'Find certified kitesurf instructors',
        heroSubtitle: 'Find the right certified kitesurf instructor for your next experience.',
        schemaTitle: 'Kitesurf instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified kitesurf instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Kitesurf instructors',
      },
      wakeboard: {
        heroTitle: 'Find certified wakeboard instructors',
        heroSubtitle: 'Find the right certified wakeboard instructor for your next experience.',
        schemaTitle: 'Wakeboard instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified wakeboard instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Wakeboard instructors',
      },
      wakesurf: {
        heroTitle: 'Find certified wakesurf instructors',
        heroSubtitle: 'Find the right certified wakesurf instructor for your next experience.',
        schemaTitle: 'Wakesurf instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified wakesurf instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Wakesurf instructors',
      },
      crosscountry: {
        heroTitle: 'Find certified cross-country instructors',
        heroSubtitle: 'Find the right certified cross-country instructor for your next experience.',
        schemaTitle: 'Cross-country instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified cross-country instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Cross-country instructors',
      },
      fitness: {
        heroTitle: 'Find certified fitness professionals',
        heroSubtitle: 'Find the right certified fitness professional for your next experience.',
        schemaTitle: 'Fitness professionals | {marketplaceName}',
        schemaDescription:
          'Browse certified fitness professionals and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Fitness professionals',
      },
      skateboard: {
        heroTitle: 'Find certified skateboard instructors',
        heroSubtitle: 'Find the right certified skateboard instructor for your next experience.',
        schemaTitle: 'Skateboard instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified skateboard instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Skateboard instructors',
      },
      swimming: {
        heroTitle: 'Find certified swimming instructors',
        heroSubtitle: 'Find the right certified swimming instructor for your next experience.',
        schemaTitle: 'Swimming instructors | {marketplaceName}',
        schemaDescription:
          'Browse certified swimming instructors and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Swimming instructors',
      },
      hiking: {
        heroTitle: 'Find certified hiking guides',
        heroSubtitle: 'Find the right certified hiking guide for your next experience.',
        schemaTitle: 'Hiking guides | {marketplaceName}',
        schemaDescription: 'Browse certified hiking guides and book your next session on PeakUp.',
        heroBannerAriaLabel: 'Hiking guides',
      },
    },
  },
  it: {
    noResults: 'Nessun professionista corrisponde ancora a questo sport.',
    sports: {
      ski: {
        heroTitle: 'Trova maestri di sci certificati',
        heroSubtitle: 'Trova il maestro di sci certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Maestri di sci | {marketplaceName}',
        schemaDescription:
          'Sfoglia maestri di sci certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Maestri di sci',
      },
      snowboard: {
        heroTitle: 'Trova maestri di snowboard certificati',
        heroSubtitle:
          'Trova il maestro di snowboard certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Maestri di snowboard | {marketplaceName}',
        schemaDescription:
          'Sfoglia maestri di snowboard certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Maestri di snowboard',
      },
      surf: {
        heroTitle: 'Trova istruttori di surf certificati',
        heroSubtitle: 'Trova l’istruttore di surf certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Istruttori di surf | {marketplaceName}',
        schemaDescription:
          'Sfoglia istruttori di surf certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Istruttori di surf',
      },
      mtb: {
        heroTitle: 'Trova guide MTB certificate',
        heroSubtitle: 'Trova la guida MTB certificata giusta per la tua prossima esperienza.',
        schemaTitle: 'Guide MTB | {marketplaceName}',
        schemaDescription:
          'Sfoglia guide MTB certificate e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Guide MTB',
      },
      tennis: {
        heroTitle: 'Trova istruttori di tennis certificati',
        heroSubtitle:
          'Trova l’istruttore di tennis certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Istruttori di tennis | {marketplaceName}',
        schemaDescription:
          'Sfoglia istruttori di tennis certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Istruttori di tennis',
      },
      golf: {
        heroTitle: 'Trova professionisti di golf certificati',
        heroSubtitle:
          'Trova il professionista di golf certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Professionisti di golf | {marketplaceName}',
        schemaDescription:
          'Sfoglia professionisti di golf certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Professionisti di golf',
      },
      yoga: {
        heroTitle: 'Trova insegnanti di yoga certificati',
        heroSubtitle:
          'Trova l’insegnante di yoga certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Insegnanti di yoga | {marketplaceName}',
        schemaDescription:
          'Sfoglia insegnanti di yoga certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Insegnanti di yoga',
      },
      climbing: {
        heroTitle: 'Trova guide di arrampicata certificate',
        heroSubtitle:
          'Trova la guida di arrampicata certificata giusta per la tua prossima esperienza.',
        schemaTitle: 'Guide di arrampicata | {marketplaceName}',
        schemaDescription:
          'Sfoglia guide di arrampicata certificate e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Guide di arrampicata',
      },
      skydive: {
        heroTitle: 'Trova istruttori di paracadutismo certificati',
        heroSubtitle:
          'Trova l’istruttore di paracadutismo certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Istruttori di paracadutismo | {marketplaceName}',
        schemaDescription:
          'Sfoglia istruttori di paracadutismo certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Istruttori di paracadutismo',
      },
      kitesurf: {
        heroTitle: 'Trova istruttori di kitesurf certificati',
        heroSubtitle:
          'Trova l’istruttore di kitesurf certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Istruttori di kitesurf | {marketplaceName}',
        schemaDescription:
          'Sfoglia istruttori di kitesurf certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Istruttori di kitesurf',
      },
      wakeboard: {
        heroTitle: 'Trova istruttori di wakeboard certificati',
        heroSubtitle:
          'Trova l’istruttore di wakeboard certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Istruttori di wakeboard | {marketplaceName}',
        schemaDescription:
          'Sfoglia istruttori di wakeboard certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Istruttori di wakeboard',
      },
      wakesurf: {
        heroTitle: 'Trova istruttori di wakesurf certificati',
        heroSubtitle:
          'Trova l’istruttore di wakesurf certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Istruttori di wakesurf | {marketplaceName}',
        schemaDescription:
          'Sfoglia istruttori di wakesurf certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Istruttori di wakesurf',
      },
      crosscountry: {
        heroTitle: 'Trova istruttori di sci di fondo certificati',
        heroSubtitle:
          'Trova l’istruttore di sci di fondo certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Istruttori di sci di fondo | {marketplaceName}',
        schemaDescription:
          'Sfoglia istruttori di sci di fondo certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Istruttori di sci di fondo',
      },
      fitness: {
        heroTitle: 'Trova professionisti fitness certificati',
        heroSubtitle:
          'Trova il professionista fitness certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Professionisti fitness | {marketplaceName}',
        schemaDescription:
          'Sfoglia professionisti fitness certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Professionisti fitness',
      },
      skateboard: {
        heroTitle: 'Trova istruttori di skateboard certificati',
        heroSubtitle:
          'Trova l’istruttore di skateboard certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Istruttori di skateboard | {marketplaceName}',
        schemaDescription:
          'Sfoglia istruttori di skateboard certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Istruttori di skateboard',
      },
      swimming: {
        heroTitle: 'Trova istruttori di nuoto certificati',
        heroSubtitle:
          'Trova l’istruttore di nuoto certificato giusto per la tua prossima esperienza.',
        schemaTitle: 'Istruttori di nuoto | {marketplaceName}',
        schemaDescription:
          'Sfoglia istruttori di nuoto certificati e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Istruttori di nuoto',
      },
      hiking: {
        heroTitle: 'Trova guide escursionistiche certificate',
        heroSubtitle:
          'Trova la guida escursionistica certificata giusta per la tua prossima esperienza.',
        schemaTitle: 'Guide escursionistiche | {marketplaceName}',
        schemaDescription:
          'Sfoglia guide escursionistiche certificate e prenota la tua prossima sessione su PeakUp.',
        heroBannerAriaLabel: 'Guide escursionistiche',
      },
    },
  },
  de: {
    noResults: 'Zu diesem Sport gibt es noch keine zertifizierten Profis.',
    sports: {
      ski: {
        heroTitle: 'Finde zertifizierte Skilehrer',
        heroSubtitle: 'Finde den passenden zertifizierten Skilehrer für dein nächstes Erlebnis.',
        schemaTitle: 'Skilehrer | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Skilehrer und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Skilehrer',
      },
      snowboard: {
        heroTitle: 'Finde zertifizierte Snowboardlehrer',
        heroSubtitle:
          'Finde den passenden zertifizierten Snowboardlehrer für dein nächstes Erlebnis.',
        schemaTitle: 'Snowboardlehrer | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Snowboardlehrer und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Snowboardlehrer',
      },
      surf: {
        heroTitle: 'Finde zertifizierte Surfinstruktoren',
        heroSubtitle:
          'Finde den passenden zertifizierten Surfinstruktor für dein nächstes Erlebnis.',
        schemaTitle: 'Surfinstruktoren | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Surfinstruktoren und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Surfinstruktoren',
      },
      mtb: {
        heroTitle: 'Finde zertifizierte MTB-Guides',
        heroSubtitle: 'Finde den passenden zertifizierten MTB-Guide für dein nächstes Erlebnis.',
        schemaTitle: 'MTB-Guides | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte MTB-Guides und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'MTB-Guides',
      },
      tennis: {
        heroTitle: 'Finde zertifizierte Tennislehrer',
        heroSubtitle:
          'Finde den passenden zertifizierten Tennislehrer für dein nächstes Erlebnis.',
        schemaTitle: 'Tennislehrer | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Tennislehrer und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Tennislehrer',
      },
      golf: {
        heroTitle: 'Finde zertifizierte Golfprofis',
        heroSubtitle: 'Finde den passenden zertifizierten Golfprofi für dein nächstes Erlebnis.',
        schemaTitle: 'Golfprofis | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Golfprofis und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Golfprofis',
      },
      yoga: {
        heroTitle: 'Finde zertifizierte Yogalehrer',
        heroSubtitle: 'Finde den passenden zertifizierten Yogalehrer für dein nächstes Erlebnis.',
        schemaTitle: 'Yogalehrer | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Yogalehrer und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Yogalehrer',
      },
      climbing: {
        heroTitle: 'Finde zertifizierte Kletterguides',
        heroSubtitle:
          'Finde den passenden zertifizierten Kletterguide für dein nächstes Erlebnis.',
        schemaTitle: 'Kletterguides | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Kletterguides und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Kletterguides',
      },
      skydive: {
        heroTitle: 'Finde zertifizierte Fallschirmspringer-Instruktoren',
        heroSubtitle:
          'Finde den passenden zertifizierten Fallschirmspringer-Instruktor für dein nächstes Erlebnis.',
        schemaTitle: 'Fallschirmspringer-Instruktoren | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Fallschirmspringer-Instruktoren und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Fallschirmspringer-Instruktoren',
      },
      kitesurf: {
        heroTitle: 'Finde zertifizierte Kitesurf-Instruktoren',
        heroSubtitle:
          'Finde den passenden zertifizierten Kitesurf-Instruktor für dein nächstes Erlebnis.',
        schemaTitle: 'Kitesurf-Instruktoren | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Kitesurf-Instruktoren und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Kitesurf-Instruktoren',
      },
      wakeboard: {
        heroTitle: 'Finde zertifizierte Wakeboard-Instruktoren',
        heroSubtitle:
          'Finde den passenden zertifizierten Wakeboard-Instruktor für dein nächstes Erlebnis.',
        schemaTitle: 'Wakeboard-Instruktoren | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Wakeboard-Instruktoren und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Wakeboard-Instruktoren',
      },
      wakesurf: {
        heroTitle: 'Finde zertifizierte Wakesurf-Instruktoren',
        heroSubtitle:
          'Finde den passenden zertifizierten Wakesurf-Instruktor für dein nächstes Erlebnis.',
        schemaTitle: 'Wakesurf-Instruktoren | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Wakesurf-Instruktoren und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Wakesurf-Instruktoren',
      },
      crosscountry: {
        heroTitle: 'Finde zertifizierte Langlauf-Instruktoren',
        heroSubtitle:
          'Finde den passenden zertifizierten Langlauf-Instruktor für dein nächstes Erlebnis.',
        schemaTitle: 'Langlauf-Instruktoren | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Langlauf-Instruktoren und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Langlauf-Instruktoren',
      },
      fitness: {
        heroTitle: 'Finde zertifizierte Fitnessprofis',
        heroSubtitle:
          'Finde den passenden zertifizierten Fitnessprofi für dein nächstes Erlebnis.',
        schemaTitle: 'Fitnessprofis | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Fitnessprofis und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Fitnessprofis',
      },
      skateboard: {
        heroTitle: 'Finde zertifizierte Skateboard-Instruktoren',
        heroSubtitle:
          'Finde den passenden zertifizierten Skateboard-Instruktor für dein nächstes Erlebnis.',
        schemaTitle: 'Skateboard-Instruktoren | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Skateboard-Instruktoren und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Skateboard-Instruktoren',
      },
      swimming: {
        heroTitle: 'Finde zertifizierte Schwimmlehrer',
        heroSubtitle:
          'Finde den passenden zertifizierten Schwimmlehrer für dein nächstes Erlebnis.',
        schemaTitle: 'Schwimmlehrer | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Schwimmlehrer und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Schwimmlehrer',
      },
      hiking: {
        heroTitle: 'Finde zertifizierte Wanderführer',
        heroSubtitle:
          'Finde den passenden zertifizierten Wanderführer für dein nächstes Erlebnis.',
        schemaTitle: 'Wanderführer | {marketplaceName}',
        schemaDescription:
          'Durchsuche zertifizierte Wanderführer und buche deine nächste Session auf PeakUp.',
        heroBannerAriaLabel: 'Wanderführer',
      },
    },
  },
  fr: {
    noResults: 'Aucun professionnel certifié ne correspond encore à ce sport.',
    sports: {
      ski: {
        heroTitle: 'Trouvez des moniteurs de ski certifiés',
        heroSubtitle:
          'Trouvez le moniteur de ski certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de ski | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de ski certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de ski',
      },
      snowboard: {
        heroTitle: 'Trouvez des moniteurs de snowboard certifiés',
        heroSubtitle:
          'Trouvez le moniteur de snowboard certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de snowboard | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de snowboard certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de snowboard',
      },
      surf: {
        heroTitle: 'Trouvez des moniteurs de surf certifiés',
        heroSubtitle:
          'Trouvez le moniteur de surf certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de surf | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de surf certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de surf',
      },
      mtb: {
        heroTitle: 'Trouvez des guides VTT certifiés',
        heroSubtitle: 'Trouvez le guide VTT certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Guides VTT | {marketplaceName}',
        schemaDescription:
          'Parcourez des guides VTT certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Guides VTT',
      },
      tennis: {
        heroTitle: 'Trouvez des moniteurs de tennis certifiés',
        heroSubtitle:
          'Trouvez le moniteur de tennis certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de tennis | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de tennis certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de tennis',
      },
      golf: {
        heroTitle: 'Trouvez des professionnels de golf certifiés',
        heroSubtitle:
          'Trouvez le professionnel de golf certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Professionnels de golf | {marketplaceName}',
        schemaDescription:
          'Parcourez des professionnels de golf certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Professionnels de golf',
      },
      yoga: {
        heroTitle: 'Trouvez des instructeurs de yoga certifiés',
        heroSubtitle:
          'Trouvez l’instructeur de yoga certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Instructeurs de yoga | {marketplaceName}',
        schemaDescription:
          'Parcourez des instructeurs de yoga certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Instructeurs de yoga',
      },
      climbing: {
        heroTitle: 'Trouvez des guides d’escalade certifiés',
        heroSubtitle:
          'Trouvez le guide d’escalade certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Guides d’escalade | {marketplaceName}',
        schemaDescription:
          'Parcourez des guides d’escalade certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Guides d’escalade',
      },
      skydive: {
        heroTitle: 'Trouvez des instructeurs de parachutisme certifiés',
        heroSubtitle:
          'Trouvez l’instructeur de parachutisme certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Instructeurs de parachutisme | {marketplaceName}',
        schemaDescription:
          'Parcourez des instructeurs de parachutisme certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Instructeurs de parachutisme',
      },
      kitesurf: {
        heroTitle: 'Trouvez des moniteurs de kitesurf certifiés',
        heroSubtitle:
          'Trouvez le moniteur de kitesurf certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de kitesurf | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de kitesurf certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de kitesurf',
      },
      wakeboard: {
        heroTitle: 'Trouvez des moniteurs de wakeboard certifiés',
        heroSubtitle:
          'Trouvez le moniteur de wakeboard certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de wakeboard | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de wakeboard certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de wakeboard',
      },
      wakesurf: {
        heroTitle: 'Trouvez des moniteurs de wakesurf certifiés',
        heroSubtitle:
          'Trouvez le moniteur de wakesurf certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de wakesurf | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de wakesurf certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de wakesurf',
      },
      crosscountry: {
        heroTitle: 'Trouvez des moniteurs de ski de fond certifiés',
        heroSubtitle:
          'Trouvez le moniteur de ski de fond certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de ski de fond | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de ski de fond certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de ski de fond',
      },
      fitness: {
        heroTitle: 'Trouvez des professionnels fitness certifiés',
        heroSubtitle:
          'Trouvez le professionnel fitness certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Professionnels fitness | {marketplaceName}',
        schemaDescription:
          'Parcourez des professionnels fitness certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Professionnels fitness',
      },
      skateboard: {
        heroTitle: 'Trouvez des moniteurs de skateboard certifiés',
        heroSubtitle:
          'Trouvez le moniteur de skateboard certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de skateboard | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de skateboard certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de skateboard',
      },
      swimming: {
        heroTitle: 'Trouvez des moniteurs de natation certifiés',
        heroSubtitle:
          'Trouvez le moniteur de natation certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Moniteurs de natation | {marketplaceName}',
        schemaDescription:
          'Parcourez des moniteurs de natation certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Moniteurs de natation',
      },
      hiking: {
        heroTitle: 'Trouvez des guides de randonnée certifiés',
        heroSubtitle:
          'Trouvez le guide de randonnée certifié idéal pour votre prochaine expérience.',
        schemaTitle: 'Guides de randonnée | {marketplaceName}',
        schemaDescription:
          'Parcourez des guides de randonnée certifiés et réservez votre prochaine session sur PeakUp.',
        heroBannerAriaLabel: 'Guides de randonnée',
      },
    },
  },
  es: {
    noResults: 'Ningún profesional certificado coincide con este deporte todavía.',
    sports: {
      ski: {
        heroTitle: 'Encuentra monitores de esquí certificados',
        heroSubtitle:
          'Encuentra al monitor de esquí certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Monitores de esquí | {marketplaceName}',
        schemaDescription:
          'Explora monitores de esquí certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Monitores de esquí',
      },
      snowboard: {
        heroTitle: 'Encuentra monitores de snowboard certificados',
        heroSubtitle:
          'Encuentra al monitor de snowboard certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Monitores de snowboard | {marketplaceName}',
        schemaDescription:
          'Explora monitores de snowboard certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Monitores de snowboard',
      },
      surf: {
        heroTitle: 'Encuentra instructores de surf certificados',
        heroSubtitle:
          'Encuentra al instructor de surf certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de surf | {marketplaceName}',
        schemaDescription:
          'Explora instructores de surf certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de surf',
      },
      mtb: {
        heroTitle: 'Encuentra guías de MTB certificados',
        heroSubtitle: 'Encuentra al guía de MTB certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Guías de MTB | {marketplaceName}',
        schemaDescription:
          'Explora guías de MTB certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Guías de MTB',
      },
      tennis: {
        heroTitle: 'Encuentra instructores de tenis certificados',
        heroSubtitle:
          'Encuentra al instructor de tenis certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de tenis | {marketplaceName}',
        schemaDescription:
          'Explora instructores de tenis certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de tenis',
      },
      golf: {
        heroTitle: 'Encuentra profesionales de golf certificados',
        heroSubtitle:
          'Encuentra al profesional de golf certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Profesionales de golf | {marketplaceName}',
        schemaDescription:
          'Explora profesionales de golf certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Profesionales de golf',
      },
      yoga: {
        heroTitle: 'Encuentra instructores de yoga certificados',
        heroSubtitle:
          'Encuentra al instructor de yoga certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de yoga | {marketplaceName}',
        schemaDescription:
          'Explora instructores de yoga certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de yoga',
      },
      climbing: {
        heroTitle: 'Encuentra guías de escalada certificados',
        heroSubtitle:
          'Encuentra al guía de escalada certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Guías de escalada | {marketplaceName}',
        schemaDescription:
          'Explora guías de escalada certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Guías de escalada',
      },
      skydive: {
        heroTitle: 'Encuentra instructores de paracaidismo certificados',
        heroSubtitle:
          'Encuentra al instructor de paracaidismo certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de paracaidismo | {marketplaceName}',
        schemaDescription:
          'Explora instructores de paracaidismo certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de paracaidismo',
      },
      kitesurf: {
        heroTitle: 'Encuentra instructores de kitesurf certificados',
        heroSubtitle:
          'Encuentra al instructor de kitesurf certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de kitesurf | {marketplaceName}',
        schemaDescription:
          'Explora instructores de kitesurf certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de kitesurf',
      },
      wakeboard: {
        heroTitle: 'Encuentra instructores de wakeboard certificados',
        heroSubtitle:
          'Encuentra al instructor de wakeboard certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de wakeboard | {marketplaceName}',
        schemaDescription:
          'Explora instructores de wakeboard certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de wakeboard',
      },
      wakesurf: {
        heroTitle: 'Encuentra instructores de wakesurf certificados',
        heroSubtitle:
          'Encuentra al instructor de wakesurf certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de wakesurf | {marketplaceName}',
        schemaDescription:
          'Explora instructores de wakesurf certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de wakesurf',
      },
      crosscountry: {
        heroTitle: 'Encuentra instructores de esquí de fondo certificados',
        heroSubtitle:
          'Encuentra al instructor de esquí de fondo certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de esquí de fondo | {marketplaceName}',
        schemaDescription:
          'Explora instructores de esquí de fondo certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de esquí de fondo',
      },
      fitness: {
        heroTitle: 'Encuentra profesionales fitness certificados',
        heroSubtitle:
          'Encuentra al profesional fitness certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Profesionales fitness | {marketplaceName}',
        schemaDescription:
          'Explora profesionales fitness certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Profesionales fitness',
      },
      skateboard: {
        heroTitle: 'Encuentra instructores de skateboard certificados',
        heroSubtitle:
          'Encuentra al instructor de skateboard certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de skateboard | {marketplaceName}',
        schemaDescription:
          'Explora instructores de skateboard certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de skateboard',
      },
      swimming: {
        heroTitle: 'Encuentra instructores de natación certificados',
        heroSubtitle:
          'Encuentra al instructor de natación certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Instructores de natación | {marketplaceName}',
        schemaDescription:
          'Explora instructores de natación certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Instructores de natación',
      },
      hiking: {
        heroTitle: 'Encuentra guías de senderismo certificados',
        heroSubtitle:
          'Encuentra al guía de senderismo certificado ideal para tu próxima experiencia.',
        schemaTitle: 'Guías de senderismo | {marketplaceName}',
        schemaDescription:
          'Explora guías de senderismo certificados y reserva tu próxima sesión en PeakUp.',
        heroBannerAriaLabel: 'Guías de senderismo',
      },
    },
  },
  pt: {
    noResults: 'Ainda não há profissionais certificados para este desporto.',
    sports: {
      ski: {
        heroTitle: 'Encontre instrutores de ski certificados',
        heroSubtitle:
          'Encontre o instrutor de ski certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de ski | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de ski certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de ski',
      },
      snowboard: {
        heroTitle: 'Encontre instrutores de snowboard certificados',
        heroSubtitle:
          'Encontre o instrutor de snowboard certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de snowboard | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de snowboard certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de snowboard',
      },
      surf: {
        heroTitle: 'Encontre instrutores de surf certificados',
        heroSubtitle:
          'Encontre o instrutor de surf certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de surf | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de surf certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de surf',
      },
      mtb: {
        heroTitle: 'Encontre guias de MTB certificados',
        heroSubtitle:
          'Encontre o guia de MTB certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Guias de MTB | {marketplaceName}',
        schemaDescription:
          'Explore guias de MTB certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Guias de MTB',
      },
      tennis: {
        heroTitle: 'Encontre instrutores de ténis certificados',
        heroSubtitle:
          'Encontre o instrutor de ténis certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de ténis | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de ténis certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de ténis',
      },
      golf: {
        heroTitle: 'Encontre profissionais de golfe certificados',
        heroSubtitle:
          'Encontre o profissional de golfe certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Profissionais de golfe | {marketplaceName}',
        schemaDescription:
          'Explore profissionais de golfe certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Profissionais de golfe',
      },
      yoga: {
        heroTitle: 'Encontre instrutores de yoga certificados',
        heroSubtitle:
          'Encontre o instrutor de yoga certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de yoga | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de yoga certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de yoga',
      },
      climbing: {
        heroTitle: 'Encontre guias de escalada certificados',
        heroSubtitle:
          'Encontre o guia de escalada certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Guias de escalada | {marketplaceName}',
        schemaDescription:
          'Explore guias de escalada certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Guias de escalada',
      },
      skydive: {
        heroTitle: 'Encontre instrutores de paraquedismo certificados',
        heroSubtitle:
          'Encontre o instrutor de paraquedismo certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de paraquedismo | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de paraquedismo certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de paraquedismo',
      },
      kitesurf: {
        heroTitle: 'Encontre instrutores de kitesurf certificados',
        heroSubtitle:
          'Encontre o instrutor de kitesurf certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de kitesurf | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de kitesurf certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de kitesurf',
      },
      wakeboard: {
        heroTitle: 'Encontre instrutores de wakeboard certificados',
        heroSubtitle:
          'Encontre o instrutor de wakeboard certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de wakeboard | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de wakeboard certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de wakeboard',
      },
      wakesurf: {
        heroTitle: 'Encontre instrutores de wakesurf certificados',
        heroSubtitle:
          'Encontre o instrutor de wakesurf certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de wakesurf | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de wakesurf certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de wakesurf',
      },
      crosscountry: {
        heroTitle: 'Encontre instrutores de ski de fundo certificados',
        heroSubtitle:
          'Encontre o instrutor de ski de fundo certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de ski de fundo | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de ski de fundo certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de ski de fundo',
      },
      fitness: {
        heroTitle: 'Encontre profissionais de fitness certificados',
        heroSubtitle:
          'Encontre o profissional de fitness certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Profissionais de fitness | {marketplaceName}',
        schemaDescription:
          'Explore profissionais de fitness certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Profissionais de fitness',
      },
      skateboard: {
        heroTitle: 'Encontre instrutores de skateboard certificados',
        heroSubtitle:
          'Encontre o instrutor de skateboard certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de skateboard | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de skateboard certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de skateboard',
      },
      swimming: {
        heroTitle: 'Encontre instrutores de natação certificados',
        heroSubtitle:
          'Encontre o instrutor de natação certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Instrutores de natação | {marketplaceName}',
        schemaDescription:
          'Explore instrutores de natação certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Instrutores de natação',
      },
      hiking: {
        heroTitle: 'Encontre guias de caminhada certificados',
        heroSubtitle:
          'Encontre o guia de caminhada certificado ideal para a sua próxima experiência.',
        schemaTitle: 'Guias de caminhada | {marketplaceName}',
        schemaDescription:
          'Explore guias de caminhada certificados e reserve a sua próxima sessão na PeakUp.',
        heroBannerAriaLabel: 'Guias de caminhada',
      },
    },
  },
};

const buildCoachDirectoryEntries = locale => {
  const copy = COPY_BY_LOCALE[locale];
  const entries = {
    'CoachDirectory.heroTitleGeneric':
      locale === 'en'
        ? 'Find professionals'
        : locale === 'it'
          ? 'Trova professionisti'
          : locale === 'de'
            ? 'Profis finden'
            : locale === 'fr'
              ? 'Trouver des professionnels'
              : locale === 'es'
                ? 'Encuentra profesionales'
                : 'Encontre profissionais',
    'CoachDirectory.noResults': copy.noResults,
    'CoachDirectory.heroBannerAriaLabelGeneric':
      locale === 'en'
        ? 'PeakUp professionals'
        : locale === 'it'
          ? 'Professionisti PeakUp'
          : locale === 'de'
            ? 'PeakUp-Profis'
            : locale === 'fr'
              ? 'Professionnels PeakUp'
              : locale === 'es'
                ? 'Profesionales PeakUp'
                : 'Profissionais PeakUp',
  };

  SPORT_KEYS.forEach(sport => {
    const sportCopy = copy.sports[sport];
    entries[`CoachDirectory.heroTitle.${sport}`] = sportCopy.heroTitle;
    entries[`CoachDirectory.heroSubtitle.${sport}`] = sportCopy.heroSubtitle;
    entries[`CoachDirectory.schemaTitle.${sport}`] = sportCopy.schemaTitle;
    entries[`CoachDirectory.schemaDescription.${sport}`] = sportCopy.schemaDescription;
    entries[`CoachDirectory.heroBannerAriaLabel.${sport}`] = sportCopy.heroBannerAriaLabel;
  });

  return entries;
};

const translationsDir = path.join(__dirname, '../src/translations');
const locales = ['en', 'it', 'de', 'fr', 'es', 'pt'];

locales.forEach(locale => {
  const filePath = path.join(translationsDir, `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const coachDirectoryEntries = buildCoachDirectoryEntries(locale);

  Object.keys(messages).forEach(key => {
    if (key.startsWith('CoachDirectory.heroTitle.') ||
        key.startsWith('CoachDirectory.heroSubtitle.') ||
        key.startsWith('CoachDirectory.schemaTitle.') ||
        key.startsWith('CoachDirectory.schemaDescription.') ||
        key.startsWith('CoachDirectory.heroBannerAriaLabel.') ||
        key === 'CoachDirectory.noResults') {
      delete messages[key];
    }
  });

  const merged = { ...messages, ...coachDirectoryEntries };
  const sorted = Object.fromEntries(
    Object.entries(merged).sort(([a], [b]) => a.localeCompare(b))
  );

  fs.writeFileSync(filePath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Updated ${locale}.json with ${Object.keys(coachDirectoryEntries).length} CoachDirectory keys`);
});

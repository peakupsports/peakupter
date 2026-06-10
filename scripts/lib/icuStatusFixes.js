/**
 * Hand-crafted ICU message fixes (inbox statuses, plurals, calendar labels).
 */
module.exports = {
  'InboxPage.default-purchase-day.delivered.status': {
    de: '{transactionRole, select, customer {Erlebnis als abgeschlossen markieren} other {Bevorstehende Buchung}}',
    fr: "{transactionRole, select, customer {Marquer l'expérience comme terminée} other {Réservation à venir}}",
    es: '{transactionRole, select, customer {Marcar experiencia como completada} other {Reserva próxima}}',
    it: "{transactionRole, select, customer {Segna l'esperienza come completata} other {Prenotazione in arrivo}}",
    pt: '{transactionRole, select, customer {Marcar experiência como concluída} other {Reserva próxima}}',
  },
  'InboxPage.default-purchase-day.reviewed-by-customer.status': {
    de: '{transactionRole, select, customer {Warte auf Coach-Bewertung} other {Warte auf deine Bewertung}}',
    fr: "{transactionRole, select, customer {En attente de l'avis du coach} other {En attente de votre avis}}",
    es: '{transactionRole, select, customer {Esperando la reseña del coach} other {Esperando tu reseña}}',
    it: '{transactionRole, select, customer {In attesa della recensione del coach} other {In attesa della tua recensione}}',
    pt: '{transactionRole, select, customer {À espera da avaliação do coach} other {À espera da sua avaliação}}',
  },
  'InboxPage.default-purchase-day.reviewed-by-provider.status': {
    de: '{transactionRole, select, customer {Warte auf deine Bewertung} other {Warte auf Kundenbewertung}}',
    fr: "{transactionRole, select, customer {En attente de votre avis} other {En attente de l'avis du client}}",
    es: '{transactionRole, select, customer {Esperando tu reseña} other {Esperando la reseña del cliente}}',
    it: '{transactionRole, select, customer {In attesa della tua recensione} other {In attesa della recensione del cliente}}',
    pt: '{transactionRole, select, customer {À espera da sua avaliação} other {À espera da avaliação do cliente}}',
  },
  'AdminTeamApplicationsPage.count': {
    de: '{count, plural, =0 {Keine Bewerbungen} one {# Bewerbung} other {# Bewerbungen}}',
    fr: '{count, plural, =0 {Aucune candidature} one {# candidature} other {# candidatures}}',
    es: '{count, plural, =0 {Sin solicitudes} one {# solicitud} other {# solicitudes}}',
    it: '{count, plural, =0 {Nessuna candidatura} one {# candidatura} other {# candidature}}',
    pt: '{count, plural, =0 {Sem candidaturas} one {# candidatura} other {# candidaturas}}',
  },
  'TeamProfilePage.coachCount': {
    de: '{count, plural, one {# Coach} other {# Coaches}}',
    fr: '{count, plural, one {# coach} other {# coaches}}',
    es: '{count, plural, one {# coach} other {# coaches}}',
    it: '{count, plural, one {# coach} other {# coach}}',
    pt: '{count, plural, one {# coach} other {# coaches}}',
  },
  'CoachCalendarPage.bookingWarningSession': {
    de: '{time} · {customer} · {status}',
    fr: '{time} · {customer} · {status}',
    es: '{time} · {customer} · {status}',
    it: '{time} · {customer} · {status}',
    pt: '{time} · {customer} · {status}',
  },
};

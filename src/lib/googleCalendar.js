const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const API_KEY   = import.meta.env.VITE_GOOGLE_API_KEY
const SCOPES    = 'https://www.googleapis.com/auth/calendar'
export const isGoogleCalendarConfigured = Boolean(CLIENT_ID && API_KEY)

let tokenClient = null
let gapiInited  = false
let gisInited   = false

export function initGoogleCalendar(onReady) {
  if (!isGoogleCalendarConfigured) return
  if (gapiInited && gisInited) {
    onReady?.()
    return
  }
  if (document.querySelector('script[data-legal-flow-gapi]') || document.querySelector('script[data-legal-flow-gis]')) return

  // Load GAPI
  const gapiScript = document.createElement('script')
  gapiScript.dataset.legalFlowGapi = 'true'
  gapiScript.src = 'https://apis.google.com/js/api.js'
  gapiScript.onload = () => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'] })
      gapiInited = true
      if (gisInited) onReady?.()
    })
  }
  document.head.appendChild(gapiScript)

  // Load GIS
  const gisScript = document.createElement('script')
  gisScript.dataset.legalFlowGis = 'true'
  gisScript.src = 'https://accounts.google.com/gsi/client'
  gisScript.onload = () => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '',
    })
    gisInited = true
    if (gapiInited) onReady?.()
  }
  document.head.appendChild(gisScript)
}

export function authorize() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Calendar ainda nao carregou.'))
      return
    }
    tokenClient.callback = (resp) => {
      if (resp.error) reject(resp)
      else resolve(resp)
    }
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

export async function listEvents(timeMin, timeMax) {
  const res = await window.gapi.client.calendar.events.list({
    calendarId: 'primary',
    timeMin, timeMax,
    showDeleted: false,
    singleEvents: true,
    maxResults: 50,
    orderBy: 'startTime',
  })
  return res.result.items || []
}

export async function createEvent(event) {
  const res = await window.gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  })
  return res.result
}

export async function deleteEvent(eventId) {
  await window.gapi.client.calendar.events.delete({
    calendarId: 'primary',
    eventId,
  })
}

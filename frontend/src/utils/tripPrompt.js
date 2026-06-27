/** Build the orchestrator prompt — uses trip form details when the user leaves prompt empty. */
export function buildTripPrompt(promptVal, tripDetails) {
  const trimmed = (promptVal || '').trim()
  if (trimmed) return trimmed
  if (!tripDetails) return ''

  const {
    origin = 'Unknown',
    destination = 'Unknown',
    start_date = '',
    end_date = '',
    number_of_travelers = 1,
    total_budget = 0,
  } = tripDetails

  const pax = number_of_travelers === 1 ? '1 traveler' : `${number_of_travelers} travelers`
  return (
    `Plan a trip from ${origin} to ${destination}, ` +
    `departing ${start_date} and returning ${end_date}, ` +
    `for ${pax} with a total budget of $${total_budget}.`
  )
}

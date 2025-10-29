import api from './api'

/**
 * Fetch all membership benefits from backend
 */
export const fetchBenefits = async () => {
  const response = await api.get('/api/benefits')
  return response.data
}

/**
 * Get formatted benefits description for a membership plan
 */
export const getBenefitsDescription = (plan) => {
  const benefits = []

  if (plan.unlimited_visits) {
    benefits.push('Unlimited free admission')
  }

  if (plan.guest_passes > 0) {
    benefits.push(`${plan.guest_passes} guest pass${plan.guest_passes > 1 ? 'es' : ''} per year`)
  }

  if (plan.priority_entry) {
    benefits.push('Priority entry to exhibitions')
  }

  if (plan.access_to_member_events) {
    benefits.push('Access to exclusive member events')
  }

  if (plan.discount_percentage > 0) {
    benefits.push(`${plan.discount_percentage}% discount at café and shop`)
  }

  return benefits
}

/**
 * Get detailed benefits list with type-specific perks
 */
export const getDetailedBenefits = (plan) => {
  const benefits = getBenefitsDescription(plan)

  // Add specific benefits based on membership type
  switch (plan.membership_type) {
    case 'Individual':
      benefits.push('One free single-use parking pass')
      benefits.push('Free parking when dining at café')
      break

    case 'Dual':
      benefits.push('All Individual benefits for two adults')
      benefits.push('Invitation to annual Members Holiday Party')
      break

    case 'Family':
      benefits.push('All Dual benefits')
      benefits.push('Admission for children 18 and under')
      benefits.push('Discounts on children\'s art classes')
      benefits.push('Invitations to family art-making programs')
      break

    case 'Patron':
      benefits.push('All Family benefits')
      benefits.push('Exhibition preview invitations')
      benefits.push('Museum publication subscription')
      benefits.push('Glassell School of Art discounts')
      benefits.push('Reciprocal privileges at 70+ U.S. museums')
      break

    default:
      break
  }

  return benefits
}

/**
 * Get image URL for membership type
 */
export const getMembershipImage = (membershipType) => {
  const images = {
    Individual: 'https://www.famsf.org/storage/images/5266a91b-7b8c-4a50-9b70-091624408128/deyoung-190930-0182-032-henrik-kam-2019-5.jpg?crop=3000,1688,x0,y312&format=jpg&quality=80&width=1000',
    Dual: 'https://pensacolamuseum.org/wp-content/uploads/2025/04/PMA_25_DUAL-9810-scaled.jpg',
    Family: 'https://media.istockphoto.com/id/1399195000/photo/mother-and-daughter-in-art-gallery.jpg?s=612x612&w=0&k=20&c=r_r2UMdb4hELHGxqx_3RAHZWiBPyUI1k2Gg23xE7A5o=',
    Patron: 'https://media.istockphoto.com/id/538359000/photo/family-on-trip-to-museum-looking-at-map-together.jpg?s=612x612&w=0&k=20&c=6ry6SAPOAdVhhz3dccXCnwSck4ikASCLRZ0Z_cQW2tU=',
  }

  return images[membershipType] || images.Individual
}

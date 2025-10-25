// File: src/components/Membership.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { ticketService } from '../services/ticketService'

export default function Membership() {
	const navigate = useNavigate()
	const [currentUser, setCurrentUser] = useState(null)
	const [membership, setMembership] = useState(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const load = async () => {
			try {
				const user = await authService.getCurrentUser()
				setCurrentUser(user)
				const uid = user?.user_id || user?.id
				if (uid) {
					try {
						const res = await ticketService.getUserMembership(uid)
						if (Array.isArray(res) && res.length > 0) setMembership(res[0])
						else setMembership(null)
					} catch {
						setMembership(null)
					}
				}
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [])

	const hasActiveMembership = useMemo(() => {
		if (!membership) return false
		const activeVal = membership.is_active
		const isActive = (activeVal === 1 || activeVal === true || activeVal === '1')
		if (!isActive) return false
		if (!membership.expiration_date) return true
		const exp = new Date(membership.expiration_date)
		const today = new Date(); today.setHours(0,0,0,0)
		return exp >= today
	}, [membership])

	return (
		<main className="auth-page" style={{ background: '#f7fafc' }}>
			<header className="hero hero--teal">
				<div className="container hero__inner">
					<h1 className="hero__title">Join Membership</h1>
				</div>
			</header>

			<section className="container" style={{ padding: '28px 0 40px' }}>
				{loading ? (
					<p className="text-center text-gray-600">Loading...</p>
				) : hasActiveMembership ? (
					<div className="max-w-2xl mx-auto">
						<div className="rounded-lg border-2 border-red-200 bg-red-50 p-5 mb-6">
							<p className="text-red-800 font-semibold">
								You already have an active membership{membership?.membership_type ? ` (${membership.membership_type})` : ''}. Purchasing another is disabled.
							</p>
							{membership?.expiration_date && (
								<p className="text-red-700 text-sm mt-1">Expires on {new Date(membership.expiration_date).toLocaleDateString()}.</p>
							)}
						</div>
						<div className="flex gap-3 justify-center">
							<Link to="/profile" className="btn btn--brand">View Profile</Link>
							<Link to="/membership" className="btn">View Membership Levels</Link>
						</div>
					</div>
				) : (
					<div className="max-w-2xl mx-auto text-center">
						<p className="text-lg text-gray-700 mb-5">
							Select a membership level to begin. You’ll review details on the next step.
						</p>
						<div className="flex gap-3 justify-center">
							<Link to="/membership" className="btn btn--brand btn--lg">Browse Membership Levels</Link>
							<button type="button" className="btn btn--light btn--lg" onClick={() => navigate(-1)}>Back</button>
						</div>
					</div>
				)}
			</section>
		</main>
	)
}


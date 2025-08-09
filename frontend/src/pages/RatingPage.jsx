import React, { useState, useEffect } from 'react'
import { RatingTable } from '../components'
import technicalApi from '../apis/Technicals'
import { pairs } from '../utils/constants'
import { toast } from 'react-toastify'

function RatingPage() {
  const [ratings, setRatings] = useState([])

  const getRatings = async () => {
    try {
      const res = await technicalApi.getRatings(pairs)
      console.log('res', res)
      if (res.data.success) {
        setRatings(res.data.data)
      } else {
        toast.error('Failed to fetch ratings')
      }
    } catch (err) {
      toast.error(err.message || 'API Error')
    }
  }

  useEffect(() => {
    getRatings() // run immediately on load

    const interval = setInterval(() => {
      getRatings()
    }, 3600000) // 1 hour in milliseconds

    return () => clearInterval(interval) // cleanup
  }, [])

  return (
    <div>
        {console.log(ratings)}
      <RatingTable ratings={ratings} />
    </div>
  )
}

export default RatingPage

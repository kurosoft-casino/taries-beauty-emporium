'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser, logoutUser, syncSessionFromServer, touchSession } from '@/lib/auth'
import { readJSON, writeText } from '@/lib/storage'
import { DEFAULT_STORE_SETTINGS, getMaintenanceMode, getStoreSettings, subscribeStoreSettings } from '@/lib/storeSettings'
import { SITE_URL } from '@/lib/site'

interface VendorSession {
  id: string
  businessName: string
  email: string
}

function updatePresence(): void {
  const user = getCurrentUser()
  if (user) {
    writeText(`taries-presence-${user.id}`, Date.now().toString())
  }

  const vendor = readJSON<VendorSession | null>('taries-vendor-session', null)
  if (vendor?.id) {
    writeText(`taries-presence-${vendor.id}`, Date.now().toString())
  }
}

export default function SiteRuntime() {
  const [maintenance, setMaintenance] = useState(false)
  const [settings, setSettings] = useState(DEFAULT_STORE_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const canonical = (() => {
      try {
        const parsed = new URL(SITE_URL)
        return { host: parsed.hostname, origin: parsed.origin }
      } catch {
        return { host: '', origin: '' }
      }
    })()

    const currentHost = window.location.hostname
    const currentOrigin = window.location.origin
    const isLocalHost =
      currentHost === 'localhost' ||
      currentHost === '127.0.0.1' ||
      currentHost.endsWith('.local')
    const isAliasHost =
      currentHost === 'tariesbeauty.com' ||
      currentHost === `www.${canonical.host}` ||
      canonical.host === `www.${currentHost}`
    const shouldRedirectToCanonical =
      canonical.host &&
      canonical.origin &&
      !isLocalHost &&
      ((currentHost !== canonical.host && isAliasHost) || (currentHost === canonical.host && currentOrigin !== canonical.origin))

    if (shouldRedirectToCanonical) {
      const destination = `${canonical.origin}${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.replace(destination)
      return
    }

    setHydrated(true)
    setMaintenance(getMaintenanceMode())
    setSettings(getStoreSettings())

    const refreshRuntime = () => {
      setMaintenance(getMaintenanceMode())
      setSettings(getStoreSettings())
    }

    const activityHandler = () => {
      touchSession()
      updatePresence()
    }

    activityHandler()
    const interval = window.setInterval(activityHandler, 60_000)
    const unsubscribe = subscribeStoreSettings(refreshRuntime)

    window.addEventListener('mousemove', activityHandler, { passive: true })
    window.addEventListener('keydown', activityHandler)
    window.addEventListener('click', activityHandler)
    window.addEventListener('scroll', activityHandler, { passive: true })
    document.addEventListener('visibilitychange', activityHandler)

    return () => {
      window.clearInterval(interval)
      unsubscribe()
      window.removeEventListener('mousemove', activityHandler)
      window.removeEventListener('keydown', activityHandler)
      window.removeEventListener('click', activityHandler)
      window.removeEventListener('scroll', activityHandler)
      document.removeEventListener('visibilitychange', activityHandler)
    }
  }, [])

  const maintenanceBlocked = useMemo(() => {
    if (!hydrated || !maintenance) return false
    const path = window.location.pathname
    return !path.includes('/admin')
  }, [hydrated, maintenance])

  useEffect(() => {
    if (!hydrated) return
    if (getCurrentUser()) {
      touchSession()
      return
    }
    void syncSessionFromServer().then(user => {
      if (!user) logoutUser()
    })
  }, [hydrated])

  if (!maintenanceBlocked) return null

  return (
    <div className="fixed inset-0 z-[10002] bg-brand-black flex items-center justify-center px-4">
      <div className="max-w-xl text-center bg-brand-black-2 border border-brand-gold/20 p-8 sm:p-10 shadow-gold-xl">
        <p className="section-label mb-3">Temporary Pause</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold gold-text mb-4">
          {settings.storeName}
        </h2>
        <p className="font-body text-brand-cream/70 leading-relaxed mb-3">
          We&apos;re making a few luxury updates behind the scenes and will be back shortly.
        </p>
        {settings.announcement && (
          <p className="font-body text-sm text-brand-gold-2 mb-6">{settings.announcement}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold"
          >
            Message Us on WhatsApp
          </a>
          <Link href="/contact" className="btn-outline-gold">
            Contact Store
          </Link>
        </div>
      </div>
    </div>
  )
}

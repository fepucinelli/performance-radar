"use client"

import { useState, useEffect } from "react"
import { UserButton } from "@clerk/nextjs"

export function UserMenu() {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-8 w-8 rounded-full bg-muted" />

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-8 w-8",
        },
      }}
      userProfileMode="navigation"
      userProfileUrl="/settings"
    />
  )
}

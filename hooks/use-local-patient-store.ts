"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  STORE_EVENT,
  appendLog,
  appendMessage,
  loadLogs,
  loadMedTaken,
  loadMessages,
  removeLog,
  toggleMedTaken,
  type HealthLogEntry,
} from "@/lib/rpm-local-store"
import type { CareMessage } from "@/lib/rpm-mock-data"

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange()
  window.addEventListener(STORE_EVENT, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(STORE_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}

function getServerSnapshot() {
  return 0
}

function getClientSnapshot() {
  return Date.now()
}

export function useLocalPatientStore(patientId: string) {
  const version = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const messages = loadMessages(patientId)
  const logs = loadLogs(patientId)
  const medTaken = loadMedTaken(patientId)

  const sendMessage = useCallback(
    (body: string, from: "doctor" | "patient") => {
      appendMessage(patientId, {
        from,
        body,
        sentAt: new Date().toISOString(),
      })
    },
    [patientId]
  )

  const addLog = useCallback(
    (entry: Omit<HealthLogEntry, "id" | "patientId">) => {
      appendLog(patientId, entry)
    },
    [patientId]
  )

  const deleteLog = useCallback(
    (logId: string) => {
      removeLog(patientId, logId)
    },
    [patientId]
  )

  const toggleMed = useCallback(
    (medId: string) => toggleMedTaken(patientId, medId),
    [patientId]
  )

  return {
    version,
    messages,
    logs,
    medTaken,
    sendMessage,
    addLog,
    deleteLog,
    toggleMed,
  }
}

export type { CareMessage, HealthLogEntry }
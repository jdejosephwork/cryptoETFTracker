import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './Tooltip.css'

interface TooltipProps {
  content: string
  children: React.ReactNode
  /** Optional delay before showing (ms) */
  delay?: number
}

export function Tooltip({ content, children, delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2
    })
  }, [])

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      updatePos()
      setVisible(true)
    }, delay)
  }, [delay, updatePos])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setVisible(false)
  }, [])

  useEffect(() => {
    const el = triggerRef.current
    if (!el) return
    el.addEventListener('mouseenter', handleMouseEnter)
    el.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      el.removeEventListener('mouseenter', handleMouseEnter)
      el.removeEventListener('mouseleave', handleMouseLeave)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [handleMouseEnter, handleMouseLeave])

  useEffect(() => {
    if (!visible) return
    const onScrollOrResize = () => updatePos()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [visible, updatePos])

  const tooltipEl = visible && content ? (
    <div
      className="tooltip-portal"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {content}
    </div>
  ) : null

  return (
    <span ref={triggerRef} className="tooltip-trigger">
      {children}
      {typeof document !== 'undefined' && document.body && tooltipEl
        ? createPortal(tooltipEl, document.body)
        : null}
    </span>
  )
}

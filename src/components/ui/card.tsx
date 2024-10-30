'use client'

import * as React from "react"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes
>(({ className, ...props }, ref) => (
  
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes
>(({ className, ...props }, ref) => (
  
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes
>(({ className, ...props }, ref) => (
  
))
CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes
>(({ className, ...props }, ref) => (
  
))
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardContent }

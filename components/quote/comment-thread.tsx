'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, Lock, Globe } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface Comment {
  id: number
  quote_id: number
  author_id: string
  content: string
  visibility: 'public' | 'internal'
  created_at: string
  profiles: {
    name: string
    role: string
  } | null
}

interface CommentThreadProps {
  quoteId: string
  userRole: 'customer' | 'operator' | 'admin'
}

export default function CommentThread({ quoteId, userRole }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchComments()
  }, [quoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/quotes/${quoteId}/comments`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fout bij ophalen reacties')
      }

      const data = await response.json()
      setComments(data)
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newComment.trim()) {
      setError('Voer een reactie in')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const response = await fetch(`/api/quotes/${quoteId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newComment.trim(),
          visibility: visibility
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fout bij versturen reactie')
      }

      const comment = await response.json()
      setComments([...comments, comment])
      setNewComment('')

      // Refresh comments to get proper profile data
      await fetchComments()

    } catch (err) {
      console.error('Error submitting comment:', err)
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'operator': return 'default'
      case 'customer': return 'secondary'
      case 'unknown': return 'outline'
      default: return 'outline'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'operator': return 'Operator'
      case 'customer': return 'Klant'
      case 'unknown': return 'Onbekend'
      default: return role
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reacties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Reacties laden...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Reacties ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">
            Nog geen reacties
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.profiles?.name || 'Onbekende gebruiker'}
                    </span>
                    {comment.profiles?.role && (
                      <Badge variant={getRoleBadgeColor(comment.profiles.role)} className="text-xs">
                        {getRoleLabel(comment.profiles.role)}
                      </Badge>
                    )}
                    {!comment.profiles?.role && (
                      <Badge variant="outline" className="text-xs">
                        Onbekend
                      </Badge>
                    )}
                    {comment.visibility === 'internal' && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Intern
                      </Badge>
                    )}
                    {comment.visibility === 'public' && userRole !== 'customer' && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Openbaar
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
          <div>
            <Label htmlFor="comment">Nieuwe reactie</Label>
            <Textarea
              id="comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Typ uw reactie..."
              rows={3}
              disabled={submitting}
              className="mt-1"
            />
          </div>

          {/* Visibility selector for operators and admins */}
          {userRole !== 'customer' && (
            <div className="flex items-center gap-4">
              <Label className="text-sm">Zichtbaarheid:</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={visibility === 'public' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisibility('public')}
                  disabled={submitting}
                  className="flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  Openbaar
                </Button>
                <Button
                  type="button"
                  variant={visibility === 'internal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisibility('internal')}
                  disabled={submitting}
                  className="flex items-center gap-1"
                >
                  <Lock className="h-3 w-3" />
                  Intern
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Versturen...' : 'Reactie versturen'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
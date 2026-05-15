'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFeedback } from './feedback-provider';
import { captureContext, type FeedbackSeverity, type FeedbackType } from './element-inspector';

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'visual_change', label: 'Visual change' },
  { value: 'missing_data', label: 'Missing data' },
  { value: 'broken_functionality', label: 'Broken functionality' },
  { value: 'content_copy', label: 'Content / copy issue' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS: { value: FeedbackSeverity; label: string }[] = [
  { value: 'blocker', label: 'Blocker' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function FeedbackDialog() {
  const { selectedTarget, setSelectedTarget, addItem } = useFeedback();
  const [type, setType] = useState<FeedbackType>('bug');
  const [severity, setSeverity] = useState<FeedbackSeverity>('medium');
  const [problem, setProblem] = useState('');
  const [expectedChange, setExpectedChange] = useState('');

  if (!selectedTarget) return null;

  const reset = () => {
    setType('bug');
    setSeverity('medium');
    setProblem('');
    setExpectedChange('');
  };

  const handleCancel = () => {
    reset();
    setSelectedTarget(null);
  };

  const handleSave = () => {
    const trimmed = problem.trim();
    if (!trimmed) return;
    addItem({
      type,
      severity,
      problem: trimmed,
      expectedChange: expectedChange.trim(),
      context: captureContext(),
      target: selectedTarget,
    });
    reset();
    setSelectedTarget(null);
  };

  const canSave = problem.trim().length > 0;

  return (
    <Dialog
      open={!!selectedTarget}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
    >
      <DialogContent className="cb-feedback-overlay max-w-xl">
        <DialogHeader>
          <DialogTitle>New feedback</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
          <div>
            <span className="text-muted-foreground">Component: </span>
            <span className="font-medium">{selectedTarget.component ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Area: </span>
            <span className="font-medium">{selectedTarget.area ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Field: </span>
            <span className="font-medium">{selectedTarget.field ?? '—'}</span>
          </div>
          <div className="break-all">
            <span className="text-muted-foreground">Selector: </span>
            <code className="rounded bg-background px-1 py-0.5 font-mono text-[11px]">
              {selectedTarget.selector}
            </code>
          </div>
          {selectedTarget.visibleText && (
            <div>
              <span className="text-muted-foreground">Visible text: </span>
              <span>{selectedTarget.visibleText}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cb-feedback-type">Type</Label>
            <select
              id="cb-feedback-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cb-feedback-severity">Severity</Label>
            <select
              id="cb-feedback-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cb-feedback-problem">What is wrong?</Label>
          <Textarea
            id="cb-feedback-problem"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Describe the issue"
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cb-feedback-expected">What should happen instead?</Label>
          <Textarea
            id="cb-feedback-expected"
            value={expectedChange}
            onChange={(e) => setExpectedChange(e.target.value)}
            placeholder="Optional"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

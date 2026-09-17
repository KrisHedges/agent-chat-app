import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../src/components/Modal.js';
import { ConfirmModal } from '../src/components/ConfirmModal.js';

describe('Modal Component', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title, subtitle, children, and footer when open', () => {
    const handleClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        title="My Custom Title"
        subtitle="Helpful description of this dialog"
        footer={<button data-testid="footer-btn">Action</button>}
      >
        <p>Main body content goes here</p>
      </Modal>
    );

    expect(screen.getByText('My Custom Title')).toBeDefined();
    expect(screen.getByText('Helpful description of this dialog')).toBeDefined();
    expect(screen.getByText('Main body content goes here')).toBeDefined();
    expect(screen.getByTestId('footer-btn')).toBeDefined();

    // Verify accessibility attributes
    const panel = screen.getByTestId('modal-panel');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Body
      </Modal>
    );

    const closeBtn = screen.getByTestId('modal-close-button');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked by default', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Body
      </Modal>
    );

    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when closeOnOverlayClick is false', () => {
    const handleClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        closeOnOverlayClick={false}
        title="Test Modal"
      >
        Body
      </Modal>
    );

    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('does not close when clicking inside the panel', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Click inside panel</p>
      </Modal>
    );

    const panel = screen.getByTestId('modal-panel');
    fireEvent.click(panel);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('closes on Escape key press when closeOnEsc is true', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Test">
        Body
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on Escape key press when closeOnEsc is false', () => {
    const handleClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        closeOnEsc={false}
        title="Escape Disabled Test"
      >
        Body
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('supports sm, md, and lg sizes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} size="sm" title="Small">
        Body
      </Modal>
    );
    expect(screen.getByTestId('modal-panel').className).toContain('sizeSm');

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} size="lg" title="Large">
        Body
      </Modal>
    );
    expect(screen.getByTestId('modal-panel').className).toContain('sizeLg');
  });
});

describe('ConfirmModal Component', () => {
  it('renders confirmation dialog with danger variant and triggers confirm/cancel', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Delete Item"
        message="Are you sure you want to permanently delete this item?"
        confirmText="Yes, Delete"
        cancelText="No, Keep It"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByText('Delete Item')).toBeDefined();
    expect(screen.getByText('Are you sure you want to permanently delete this item?')).toBeDefined();

    // Check alertdialog accessibility role
    const panel = screen.getByTestId('confirm-modal-panel');
    expect(panel.getAttribute('role')).toBe('alertdialog');

    // Cancel action
    const cancelBtn = screen.getByTestId('confirm-modal-cancel-btn');
    expect(cancelBtn.textContent).toBe('No, Keep It');
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    // Confirm action
    const confirmBtn = screen.getByTestId('confirm-modal-confirm-btn');
    expect(confirmBtn.textContent).toBe('Yes, Delete');
    expect(confirmBtn.className).toContain('btn-danger');
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('triggers onConfirm when Enter key is pressed', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Quick Confirm"
        message="Press enter to proceed"
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('handles loading state properly', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Processing"
        message="Deleting in progress..."
        isLoading={true}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const confirmBtn = screen.getByTestId('confirm-modal-confirm-btn');
    const cancelBtn = screen.getByTestId('confirm-modal-cancel-btn');

    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
    expect(cancelBtn.hasAttribute('disabled')).toBe(true);

    // Enter key should NOT fire confirm during loading
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(handleConfirm).not.toHaveBeenCalled();
  });
});

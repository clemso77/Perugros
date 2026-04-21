import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import Toast from './Toast';

describe('Toast', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('renders message and triggers onDone after duration', () => {
        const onDone = jest.fn();
        render(<Toast message="Hello" type="info" onDone={onDone} duration={1000} />);

        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(onDone).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('returns null when message is empty', () => {
        const { container } = render(<Toast message="" type="error" />);
        expect(container.firstChild).toBeNull();
    });
});

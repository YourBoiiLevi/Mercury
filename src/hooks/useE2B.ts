import { useContext } from 'react';
import { E2BContext, E2BContextValue } from '../contexts/E2BContext';

export const useE2B = (): E2BContextValue => {
    const context = useContext(E2BContext);

    if (!context) {
        throw new Error('useE2B must be used within E2BProvider');
    }

    return context;
};

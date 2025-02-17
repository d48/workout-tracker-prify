import { ReactNode, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';

interface LoadingTransitionProps {
  loading: boolean;
  children: ReactNode;
  skeleton: ReactNode;
}

export default function LoadingTransition({ loading, children, skeleton }: LoadingTransitionProps) {
  const nodeRefLoading = useRef(null);
  const nodeRefContent = useRef(null);

  return (
    <div className="relative min-h-[100px]">
      <CSSTransition
        in={loading}
        timeout={200}
        classNames="fade"
        unmountOnExit
        nodeRef={nodeRefLoading}
      >
        <div ref={nodeRefLoading} className="absolute inset-0">
          {skeleton}
        </div>
      </CSSTransition>

      <CSSTransition
        in={!loading}
        timeout={200}
        classNames="fade"
        unmountOnExit
        nodeRef={nodeRefContent}
      >
        <div ref={nodeRefContent} className="absolute inset-0">
          {children}
        </div>
      </CSSTransition>
    </div>
  );
}
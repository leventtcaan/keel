import { forwardRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

/**
 * A scrolling form the way an iPhone's are (K-1065): the keyboard pushes the content up by its own height, so the field being
 * typed in and the button under it are never hidden (`automaticallyAdjustKeyboardInsets`); a drag down closes the keyboard, as
 * in Notes and Messages (`keyboardDismissMode`); and a tap on the empty part closes it too — a tap on a button or a field still
 * reaches it (`keyboardShouldPersistTaps`).
 */
export const FormScroll = forwardRef<ScrollView, ScrollViewProps>(function FormScroll(props, ref) {
  return <ScrollView ref={ref} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets {...props} />;
});

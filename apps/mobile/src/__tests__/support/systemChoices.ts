/**
 * The system's own questions as a test answers them: the alert that asks before a destructive step (ADR-087 #1) and the action
 * sheet a row's options come in. Each helper answers the next question with the named choice and returns the spy that saw it.
 */
import { ActionSheetIOS, Alert } from 'react-native';

/** The next Alert.alert is answered with its destructive button ("confirm") or its cancel one ("keep"). */
export function answerAlert(answer: 'confirm' | 'keep' = 'confirm') {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    const wanted = buttons?.find((b) => (answer === 'confirm' ? b.style === 'destructive' : b.style === 'cancel'));
    wanted?.onPress?.();
  });
}

/** The next action sheet is answered by the option with this text. */
export function answerSheet(label: string) {
  return jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((options, callback) => {
    callback(options.options.indexOf(label));
  });
}

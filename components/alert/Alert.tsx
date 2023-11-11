import { useEffect } from "react";
import styles from "./Alert.module.scss";
import cn from "classnames";

export function Alert({
  message = "",
  visible = false,
  onClose = () => {},
  isError = false,
}) {
  useEffect(() => {
    if (visible) {
      const timeout = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  return (
    <>
      {visible && (
        <div
          onClick={onClose}
          className={cn({
            [styles.container]: true,
            [styles.container__error]: isError,
          })}
        >
          <p className={styles.message}>{message}</p>
        </div>
      )}
    </>
  );
}

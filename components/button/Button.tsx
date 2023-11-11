"use client";
import styles from "./Button.module.scss";
import cn from "classnames";
import Link from "next/link";

export function Button({
  text = "",
  className = "",
  onClick = (e) => {},
  disabled = false,
  type = "button",
  loading = false,
  loadingText = "",
  theme = "primary",
  icon = undefined,
  squareCorner = false,
  border = false,
  uppercase = false,
  href = "",
  small = false,
  openLinkInNewTab = false,
  svgIcon = undefined,
  ...props
}: {
  text?: string | null;
  className?: string;
  onClick?: (e: any) => any;
  disabled?: boolean;
  type?: "button" | "submit";
  loading?: boolean;
  loadingText?: string | null;
  theme?:
    | "primary"
    | "secondary"
    | "green"
    | "gray"
    | "transparent"
    | "white"
    | "light"
    | "red";
  icon?: string;
  squareCorner?: boolean;
  border?: boolean;
  uppercase?: boolean;
  href?: string;
  small?: boolean;
  openLinkInNewTab?: boolean;
  svgIcon?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLElement>) {
  return (
    <>
      {href && (
        <Link
          className={cn({
            [styles.button]: true,
            [styles[`button__${theme}`]]: true,
            [className]: !!className,
            [styles.square__corner]: squareCorner,
            [styles.with__border]: border,
            [styles.uppercase]: uppercase,
            [styles.disabled]: disabled,
            [styles.small]: small,
          })}
          target={openLinkInNewTab ? "_blank" : "_self"}
          href={disabled ? "#" : href}
          {...props}
        >
          <>
            {icon && <img src={icon} className={styles.button__icon} />}
            {svgIcon && <div className={styles.button__icon}>{svgIcon}</div>}
            <p className={styles.button__text}>
              {loading ? loadingText : text}
            </p>
          </>
        </Link>
      )}
      {!href && (
        <button
          type={type}
          onClick={onClick}
          disabled={disabled || loading}
          className={cn({
            [styles.button]: true,
            [styles[`button__${theme}`]]: true,
            [className]: !!className,
            [styles.square__corner]: squareCorner,
            [styles.with__border]: border,
            [styles.uppercase]: uppercase,
            [styles.small]: small,
          })}
          {...props}
        >
          {icon && <img src={icon} className={styles.button__icon} />}
          {svgIcon && <div className={styles.button__icon}>{svgIcon}</div>}
          <p className={styles.button__text}>{loading ? loadingText : text}</p>
        </button>
      )}
    </>
  );
}

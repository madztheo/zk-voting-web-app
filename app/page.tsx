import Image from "next/image";
import styles from "./page.module.scss";
import Content from "./_components";

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Content />
      </div>
    </div>
  );
}

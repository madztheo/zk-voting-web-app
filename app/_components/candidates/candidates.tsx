"use client";
import styles from "./candidates.module.scss";
import cn from "classnames";
import elizabeth from "@/public/images/elizabeth.jpg";
import jonathan from "@/public/images/jonathan.jpg";
import kevin from "@/public/images/kevin.jpg";
import maria from "@/public/images/maria.jpg";
import paul from "@/public/images/paul.jpg";
import sam from "@/public/images/sam.jpg";
import simon from "@/public/images/simon.jpg";
import stephany from "@/public/images/stephany.jpg";
import { useState } from "react";
import Image from "next/image";
import { useLocalStorage } from "@/hooks";

const CATS = [
  {
    name: "Elizabeth",
    image: elizabeth,
  },
  {
    name: "Jonathan",
    image: jonathan,
  },
  {
    name: "Kevin",
    image: kevin,
  },
  {
    name: "Maria",
    image: maria,
  },
  {
    name: "Paul",
    image: paul,
  },
  {
    name: "Sam",
    image: sam,
  },
  {
    name: "Simon",
    image: simon,
  },
  {
    name: "Stephany",
    image: stephany,
  },
];

export default function Candidates({
  showResults = false,
  onCastVote,
}: {
  showResults?: boolean;
  onCastVote?: (number: number) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [electionResults, setElectionResults] = useLocalStorage(
    "electionResults",
    {
      candidates: Array(8).fill(0) as number[],
    }
  );

  const getTotalVotes = () => {
    return electionResults.candidates.reduce((a, b) => a + b, 0);
  };

  const getShare = (index: number) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) {
      return 0;
    }
    return (electionResults.candidates[index] / totalVotes) * 100;
  };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {CATS.map((cat, index) => (
          <div
            className={cn(styles.cat, {
              [styles.selected]: index === selectedIndex,
            })}
            key={index}
            onClick={() => {
              setSelectedIndex(index);
              onCastVote?.(index);
            }}
          >
            <div className={styles.cat__image}>
              {showResults && (
                <div
                  className={styles.cat__vote__mask}
                  style={{
                    height: `${getShare(index)}%`,
                  }}
                >
                  <p className={styles.cat__vote__value}>{getShare(index)}%</p>
                </div>
              )}
              <Image
                src={cat.image}
                alt={`Picture of ${cat.name}`}
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
            <p className={styles.cat__name}>{cat.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

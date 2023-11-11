import {
  Field,
  PublicKey,
  Poseidon,
  MerkleMap,
  Struct,
  UInt32,
  Signature,
  MerkleMapWitness,
  Provable,
} from 'o1js';

export const CANDIDATES = [
  'Elizabeth',
  'Jonathan',
  'Kevin',
  'Maria',
  'Paul',
  'Sam',
  'Simon',
  'Stephany',
];

export class Election extends Struct({
  title: String,
  id: Field,
  candidates: [Field, Field, Field, Field],
}) {}

export class StateTransition extends Struct({
  voterDataRoot: Field, // this never changes
  nullifier: {
    before: Field,
    after: Field,
  },
  electionId: Field,
  result: {
    before: {
      candidates: [Field, Field, Field, Field],
    },
    after: {
      candidates: [Field, Field, Field, Field],
    },
  },
}) {}

export class VotingPeriod extends Struct({
  electionPeriod: {
    start: UInt32,
    end: UInt32,
  },
  challengingPeriod: {
    start: UInt32,
    end: UInt32,
  },
}) {}

export class VoterData extends Struct({
  publicKey: PublicKey,
}) {
  hash(): Field {
    return Poseidon.hash(this.publicKey.toFields());
  }

  toJSON() {
    return {
      publicKey: this.publicKey.toBase58(),
    };
  }
}

export type JSONVote = {
  voter: string;
  authorization: {
    r: string;
    s: string;
  };
  voterDataRoot: string;
  candidateId: string;
  electionId: string;
};

export function validateJSONVote(json: unknown): json is JSONVote {
  return (
    typeof json === 'object' &&
    json !== null &&
    'voter' in json &&
    'authorization' in json &&
    'voterDataRoot' in json &&
    'candidateId' in json &&
    'electionId' in json
  );
}

export class Vote extends Struct({
  voter: PublicKey,
  authorization: Signature,
  voterDataRoot: Field,
  electionId: Field,
  candidateId: Field,
}) {
  fromJSON(json: JSONVote): Vote {
    return new Vote({
      voter: PublicKey.fromBase58(json.voter),
      authorization: Signature.fromJSON(json.authorization),
      voterDataRoot: Field(json.voterDataRoot),
      candidateId: Field(json.candidateId),
      electionId: Field(json.electionId),
    });
  }

  verifySignature(publicKey: PublicKey) {
    return this.authorization.verify(publicKey, [
      this.candidateId,
      this.electionId,
      this.voterDataRoot,
    ]);
  }
}

// just a tiny helper function
export function MerkleMapExtended<
  V extends {
    hash(): Field;
    toJSON(): any;
  }
>() {
  let merkleMap = new MerkleMap();
  let map = new Map<string, V>();

  return {
    get(key: Field): V {
      return map.get(key.toString())!;
    },
    set(key: Field, value: V) {
      map.set(key.toString(), value);
      merkleMap.set(key, value.hash());
    },
    getRoot(): Field {
      return merkleMap.getRoot();
    },
    getWitness(key: Field): MerkleMapWitness {
      return merkleMap.getWitness(key);
    },
    flat() {
      let leaves = [...map.keys()].map((key, i) => {
        let entry = map.get(key)!;
        return {
          i,
          key,
          data: { ...entry.toJSON(), hash: entry.hash().toString() },
        };
      });
      return {
        meta: {
          root: merkleMap.getRoot().toString(),
          height: merkleMap.tree.height.toString(),
          leafCount: merkleMap.tree.leafCount.toString(),
        },
        leaves,
      };
    },
  };
}

export function Nullifier(publicKey: PublicKey, electionId: Field) {
  return Poseidon.hash(publicKey.toFields().concat(electionId));
}

export function calculateNullifierRootTransition(
  nullifierTree: MerkleMap,
  votes: Vote[]
) {
  let rootBefore = nullifierTree.getRoot();
  votes.forEach((v) => {
    let key = Nullifier(v.voter, v.electionId);
    nullifierTree.set(key, Field(1));
  });
  return {
    rootBefore,
    rootAfter: nullifierTree.getRoot(),
  };
}

export function calculateVotes(votes: Vote[]) {
  const getCandidateCount = (id: Field) => {
    return votes.reduce((acc, val) => {
      return Provable.if(val.candidateId.equals(id), acc.add(Field(1)), acc);
    }, Field(0));
  };

  return Array(4)
    .fill(0)
    .map((_, i) => getCandidateCount(Field(i)));
}

export function validateVote(
  jsonVote: JSONVote,
  votePool: Vote[],
  voterData: { publicKey: PublicKey }[]
): undefined | string {
  let vote = Vote.fromJSON(jsonVote);

  let isVoter = voterData.find((v) =>
    v.publicKey.equals(vote.voter).toBoolean()
  );

  if (!isVoter) {
    return 'Voter is not part of list of eligible voters.';
  }

  let payload = vote.voter
    .toFields()
    .concat([vote.candidateId, vote.voterDataRoot]);
  let isValid = vote.authorization.verify(vote.voter, payload).toBoolean();

  if (isValid) {
    // we check that there are no multiple votes from the same voter in the pool - just some pre-checking to prevent spam
    let exists = votePool.find((v) => v.voter.equals(vote.voter));
    if (!exists) {
      votePool.push(vote as Vote);
      return;
    }
    return 'Vote already casted.';
  }
  return 'Vote is not valid.';
}

//export function aggregateVotes(votePool: Vote[]) {}

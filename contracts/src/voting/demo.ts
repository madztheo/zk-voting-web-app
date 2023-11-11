import { Field, MerkleMap, Poseidon, PrivateKey, Signature } from 'o1js';

import {
  CANDIDATES,
  Election,
  MerkleMapExtended,
  StateTransition,
  Vote,
  VoterData,
  calculateNullifierRootTransition,
  calculateVotes,
} from './vote_aggregator/lib';

import { Prover } from './vote_aggregator/prover';

console.log('generating three random entries..');

let priv = PrivateKey.random();
let priv2 = PrivateKey.random();
let priv3 = PrivateKey.random();

const VoterDataTree = MerkleMapExtended<VoterData>();

// we add our list of eligible voters to the voter data merkle tree
let vd = new VoterData({ publicKey: priv.toPublicKey() });
let vd2 = new VoterData({ publicKey: priv2.toPublicKey() });
let vd3 = new VoterData({ publicKey: priv3.toPublicKey() });
VoterDataTree.set(Poseidon.hash(priv.toPublicKey().toFields()), vd);
VoterDataTree.set(Poseidon.hash(priv2.toPublicKey().toFields()), vd2);
VoterDataTree.set(Poseidon.hash(priv3.toPublicKey().toFields()), vd3);

console.log(
  'added three dummy voters, root: ',
  VoterDataTree.getRoot().toString()
);

// this is a bit annoying but will do for now - NullifierTreeSync stays in sync with all transitions while NullifierTreeProver is only being used inside the prover
const NullifierTreeTemp = new MerkleMap();
const NullifierTreeProver = new MerkleMap();

console.log('generating prover..');
const VoteProver = Prover(NullifierTreeProver, VoterDataTree);
console.log('compiling prover..');
await VoteProver.compile();
console.log('prover compiled!');

// creating a new proposal - this can also be done on-demand, via an API, etc
let election = new Election({
  title: 'The Cat',
  id: Field(123456), // this should be unique to prevent replay attacks
  candidates: Array(8)
    .fill(Field(0))
    .map((v) => Field(v)),
});

console.log('created a new election!');
console.log(`title: ${election.title}
  id: ${election.id}`);

let voterDataRoot = VoterDataTree.getRoot();

console.log('generating three votes..');
let v1 = new Vote({
  authorization: Signature.create(priv, [
    Field(1), // Candidate ID
    election.id, // the proposal id, by signing it we prevent replay attacks
    voterDataRoot, // match the predefined voter data
  ]),
  // the values exist twice, because above we just sign them
  candidateId: Field(1),
  electionId: election.id,
  voter: priv.toPublicKey(),
  voterDataRoot: voterDataRoot,
});

let v2 = new Vote({
  authorization: Signature.create(priv2, [
    Field(2), // Candidate ID
    election.id,
    voterDataRoot,
  ]),
  candidateId: Field(2),
  electionId: election.id,
  voter: priv2.toPublicKey(),
  voterDataRoot: voterDataRoot,
});

let v3 = new Vote({
  authorization: Signature.create(priv3, [
    Field(5), // Candidate ID
    election.id,
    voterDataRoot,
  ]),
  candidateId: Field(5),
  electionId: election.id,
  voter: priv3.toPublicKey(),
  voterDataRoot: voterDataRoot,
});

let votes = [v1, v2, v3];

// we prepare our witnesses for all votes, this is just some auxillary stuff. proving happens later
let { rootBefore, rootAfter } = calculateNullifierRootTransition(
  NullifierTreeTemp,
  votes
);
// we calculate the votes after we aggregate all. again, auxillary things because we have to prove a transition f(votes, s_1) = s_2
let votesAfter = calculateVotes(votes);

// this is our state transition data structure!
let st = new StateTransition({
  nullifier: {
    before: rootBefore,
    after: rootAfter,
  },
  // specific for this proposal
  electionId: election.id,
  // this is where we aggregate the results
  result: {
    // we obviously start with 0 - 0 - 0 with a fresh proposal
    before: {
      candidates: Array(8)
        .fill(Field(0))
        .map((v) => Field(v)),
    },
    after: {
      candidates: votesAfter,
    },
  },
  voterDataRoot: voterDataRoot,
});

console.log('proving three votes..');
// we proof three votes!
let pi = await VoteProver.baseCase(st, votes);
pi.verify();
console.log('votes valid!');
console.log(`result for proposal #${election.id}, ${election.title}:\n`);

CANDIDATES.map((c, i) => {
  console.log(`${c}: ${pi.publicInput.result.after.candidates[i].toString()}`);
});

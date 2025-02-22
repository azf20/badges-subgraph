import { BigInt, Address, log, Bytes, ipfs } from '@graphprotocol/graph-ts';

const raftsUrnNamespace = 'rafts';
const badgesUrnNamespace = 'badges';
const metadataPart = '/metadata.json';

// returns a fully formed metadata uri for raft & badge metadata
export function appendMetadataPath(uri: string): string {
  return uri.concat(metadataPart);
}

export function getFullMetadataPath(cid: string): string {
  return `ipfs://${cid}${metadataPart}`;
}

// returns a string that is a CID extracted from the IPFS uri
export function getCIDFromIPFSUri(uri: string): string {
  let cid = '';
  if (uri.indexOf('ipfs://') >= 0 || uri.indexOf('https://ipfs.io') >= 0) {
    uri = uri.replaceAll(metadataPart, '');
    cid = uri.substring(uri.lastIndexOf('/') + 1);
  } else if (uri.indexOf('nftstorage') > 0) {
    const parts = uri.split('.');
    const cidPart = parts[0];
    cid = cidPart.substring(cidPart.lastIndexOf('/') + 1);
  } else {
    cid = uri;
  }

  return cid;
}

// returns a string representing the raftID in the format `rafts:raftAddress:raftTokenId`
export function getRaftID(raftTokenId: BigInt, raftAddress: Address): string {
  return raftsUrnNamespace.concat(':').concat(raftTokenId.toString());
}

// returns a string representing a unique badgeID in the format `badges:badgeAddress:badgeTokenId`
export function getBadgeID(badgeTokenId: BigInt, badgeAddress: Address): string {
  return badgesUrnNamespace.concat(':').concat(badgeTokenId.toString());
}

export function getIPFSMetadataBytes(cid: string): Bytes | null {
  let metadataBytes = ipfs.cat(cid);
  if (!metadataBytes) {
    const cidPath = appendMetadataPath(cid);
    metadataBytes = ipfs.cat(cidPath);
  }

  return metadataBytes;
}

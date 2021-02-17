// @flow
import { DOMAIN } from 'config';
import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import Spinner from 'component/spinner';
import ChannelPage from 'page/channel';
import FilePage from 'page/file';
import Page from 'component/page';
import Button from 'component/button';
import Card from 'component/common/card';
import AbandonedChannelPreview from 'component/abandonedChannelPreview';
import { formatLbryUrlForWeb } from 'util/url';

type Props = {
  isResolvingUri: boolean,
  resolveUri: string => void,
  isSubscribed: boolean,
  uri: string,
  claim: StreamClaim,
  location: UrlLocation,
  blackListedOutpoints: Array<{
    txid: string,
    nout: number,
  }>,
  title: string,
  claimIsMine: boolean,
  claimIsPending: boolean,
  collectionId: string,
  collection: Collection,
  collectionIndex: number,
  isResolvingCollection: boolean,
};

function ShowPage(props: Props) {
  const {
    isResolvingUri,
    resolveUri,
    uri,
    claim,
    blackListedOutpoints,
    location,
    claimIsMine,
    isSubscribed,
    claimIsPending,
    collectionResolve,
    collectionId,
    collection,
    collectionIndex,
    collectionUrls,
    isResolvingCollection,
  } = props;
  const { search } = location;

  const signingChannel = claim && claim.signing_channel;
  const canonicalUrl = claim && claim.canonical_url;
  const claimExists = claim !== null && claim !== undefined;
  const haventFetchedYet = claim === undefined;
  const isMine = claim && claim.is_my_output;
  const claimId = claim && claim.claim_id;
  const isCollection = claim && claim.value_type === 'collection';
  const collectionClaimId = collectionId || (isCollection && claimId);
  const resolvedCollection = collection && collection.id; // not null
  let urlForCollectionIndex = collectionUrls && collectionUrls[collectionIndex];

  React.useEffect(() => {
    if (isCollection && !resolvedCollection) {
      // if we have it and it's not null
      collectionResolve(collectionClaimId);
    }
  }, [isCollection, resolvedCollection, collectionClaimId, collectionResolve]);

  useEffect(() => {
    // @if TARGET='web'
    if (canonicalUrl) {
      const canonicalUrlPath = '/' + canonicalUrl.replace(/^lbry:\/\//, '').replace(/#/g, ':');
      // Only redirect if we are in lbry.tv land
      // replaceState will fail if on a different domain (like webcache.googleusercontent.com)
      if (canonicalUrlPath !== window.location.pathname && DOMAIN === window.location.hostname) {
        history.replaceState(history.state, '', canonicalUrlPath);
      }
    }
    // @endif

    if (
      (resolveUri && !isResolvingUri && uri && haventFetchedYet) ||
      (claimExists && !claimIsPending && (!canonicalUrl || isMine === undefined))
    ) {
      resolveUri(uri);
    }
  }, [resolveUri, isResolvingUri, canonicalUrl, uri, claimExists, haventFetchedYet, history, isMine, claimIsPending]);

  // Don't navigate directly to repost urls
  // Always redirect to the actual content
  // Also need to add repost_url to the Claim type for flow
  // $FlowFixMe
  if (claim && claim.repost_url === uri) {
    const newUrl = formatLbryUrlForWeb(claim.canonical_url);
    return <Redirect to={newUrl} />;
  }

  // fis for claims
  if (claim && claim.value_type === 'collection' && urlForCollectionIndex) {
    const claimId = claim.claim_id;
    const urlParams = new URLSearchParams(search);
    urlParams.set('pl', claimId);
    const newUrl = formatLbryUrlForWeb(`${urlForCollectionIndex}?${urlParams.toString()}`);
    return <Redirect to={newUrl} />;
    // search it, pass the key
  }

  // if no items in collection, then what?
  // if mature, then what?

  // if (claim && claim.value.claims
  let innerContent = '';
  if (!claim || (claim && !claim.name) || isResolvingCollection) {
    innerContent = (
      <Page>
        {(claim === undefined || isResolvingUri || (claim && claim.value_type === 'collection')) && (
          <div className="main--empty">
            <Spinner />
          </div>
        )}
        {!isResolvingUri && !isSubscribed && (
          <span className="empty">{__("There's nothing available at this location.")}</span>
        )}
        {!isResolvingUri && isSubscribed && claim === null && <AbandonedChannelPreview uri={uri} type={'large'} />}
      </Page>
    );
  } else if (claim.name.length && claim.name[0] === '@') {
    innerContent = <ChannelPage uri={uri} location={location} />;
  } else if (claim && blackListedOutpoints) {
    let isClaimBlackListed = false;

    isClaimBlackListed = blackListedOutpoints.some(
      outpoint =>
        (signingChannel && outpoint.txid === signingChannel.txid && outpoint.nout === signingChannel.nout) ||
        (outpoint.txid === claim.txid && outpoint.nout === claim.nout)
    );

    if (isClaimBlackListed && !claimIsMine) {
      innerContent = (
        <Page>
          <Card
            title={uri}
            subtitle={__(
              'In response to a complaint we received under the US Digital Millennium Copyright Act, we have blocked access to this content from our applications.'
            )}
            actions={
              <div className="section__actions">
                <Button button="link" href="https://lbry.com/faq/dmca" label={__('Read More')} />
              </div>
            }
          />
        </Page>
      );
    } else {
      innerContent = <FilePage uri={uri} location={location} />;
    }
  }

  return innerContent;
}

export default ShowPage;

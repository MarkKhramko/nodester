'use strict';

// Nodester receives this real NQL query. Express receives ordinary query
// parameters and uses req.query, as an Express application normally would.
const NQL_QUERY = 'status=active&limit=20&order_by=id&order=asc&fn=count(posts)&includes=posts(status=published&score=gte(97)&limit=2).comments(approved=1&limit=1)';
const EXPRESS_QUERY = 'status=active&post_status=published&post_score_gte=97&post_limit=2&comment_approved=1&comment_limit=1&limit=20&order_by=id&order=asc&include=posts.comments&count=posts';

module.exports = {
	NQL_QUERY,
	NQL_PATH: `/complex-query?${ encodeURIComponent(NQL_QUERY) }`,
	EXPRESS_PATH: `/complex-query?${ EXPRESS_QUERY }`
};

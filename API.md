# REST API

<img src="https://cloud.githubusercontent.com/assets/37303/4924181/09996b6c-6521-11e4-86f2-0d7aca8f626b.png" alt="api image" width="500" height="332">

- [Objects](#objects)
  - [`ListContainer`](#listcontainer)
    - [`UserResponse`](#userresponse)
    - [`Issue`](#issue)
      - [`ResponseStatistics`](#responsestatistics)
        - [`YesNoMaybeTally`](#yesnomaybetally)
- [Endpoints](#endpoints)
  - [Issue-centric Endpoints](#issue-centric-endpoints)
    - [`GET /api/v1/issues`](#get-apiv1issues)
    - [`GET /api/v1/issues/{repoUser}/{repoName}`](#get-apiv1issuesrepouserreponame)
    - [`GET /api/v1/issues/{repoUser}/{repoName}/{issueNumber}`](#get-apiv1issuesrepouserreponameissuenumber)
  - [UserResponse-centric Endpoints](#userresponse-centric-endpoints)
    - [`GET /api/v1/responses/all`](#get-apiv1responsesall)
    - [`GET /api/v1/responses/complete`](#get-apiv1responsescomplete)

## Objects

The following subsections detail the common types of objects that the API will return.

### `ListContainer`

```
{
  "objects": [<Objects>],
  "meta": {
    "next": "string of next URL" | null,
    "prev": "string of prev URL" | null,
    "total": Number
  }
}
```

A object representing a list of items. The `<Objects>` may be [issues](#issue) or 
[responses](#userresponse), based on the endpoint used. If there's no next page, `meta.next`
will be `null`. Similarly, if there's no previous page, `meta.prev` will be `null`.

--------------

#### `UserResponse`

```
{
  "state": "complete" |
           "incomplete" |
           "on_question_1" |
           "on_question_2" |
           "on_question_3" |
           "on_question_4" |
           "on_question_5" |
           "on_question_6",
  "inCorrectRepository": true | false | null,
  "duplicates": "string" | "" | null,
  "hasConsensus": true | false | null,
  "isFeatureRequest": true | false | null,
  "hasReproductionSteps": true | false | null,
  "isIssueOnVersions": {<version>: <YesNoMaybeTally Object>} | {},
  "startedAt": <ISO timestamp>,
  "updatedAt": <ISO timestamp>,
  "finishedAt": <ISO timestamp> | null,
  "issueURL": "https://github.com/user/repo/number"
}
```

An object representing a single response to a issue under triage. If incomplete, `isIssueOnVersions` 
will be an empty object. 

**Example Objects**:

Incomplete, sans `isIssueOnVersions`:

```json
{
  "state": "incomplete",
  "inCorrectRepository": null,
  "duplicates": null,
  "isFeatureRequest": null,
  "hasConsensus": null,
  "hasReproductionSteps": null,
  "startedAt": "2014-11-06T16:34:42.173Z",
  "updatedAt": "2014-11-06T16:34:42.173Z",
  "finishedAt": null,
  "issueURL": "https://github.com/joyent/node/10000",
  "isIssueOnVersions": {}
}
```

Complete, with `isIssueOnVersions`:

```json
{
  "state": "complete",
  "inCorrectRepository": null,
  "duplicates": null,
  "isFeatureRequest": false,
  "hasConsensus": true,
  "hasReproductionSteps": true,
  "startedAt": "2014-10-31T21:32:18.316Z",
  "updatedAt": "2014-10-31T21:32:18.316Z",
  "finishedAt": null,
  "issueURL": "https://github.com/joyent/node/10000",
  "isIssueOnVersions": {
    "0.11": {
      "yes": 1,
      "no": 0,
      "idk": 0
    },
    "0.10": {
      "yes": 1,
      "no": 0,
      "idk": 0
    }
  }
}
```

--------------

#### `Issue`

```
{ 
  "number": <github issue number>,
  "state": "open" | "closed",
  "title": <github issue title>,
  "createdAt": <iso timestamp>
  "updatedAt": <iso timestamp> | null,
  "closedAt": <iso timestamp> | null,
  "issueURL": <string>,
  "stats": <ResponseStatistics Object>
}
```

Represents a single github issue and Nodebug.me's current triage
response statistics on that issue.

**Example Object**:

```json
{
  "number": 10000000,
  "state": "open",
  "title": "Use human brains as computational substrate for 'cluster' module",
  "createdAt": "2084-11-01T18:58:20.000Z",
  "updatedAt": "2084-11-01T19:01:26.000Z",
  "closedAt": null,
  "issueURL": "https://github.com/joyent/ndoe/10000000",
  "stats": {
      "total": "3",
      "duplicates": ["", "", ""],
      "inCorrectRepository": {
        "yes": "0",
        "no": "0",
        "idk": "3"
      },
      "hasConsensus": {
        "yes": "1",
        "no": "2",
        "idk": "1"
      },
      "isFeatureRequest": {
        "yes": "3",
        "no": "0",
        "idk": "0"
      },
      "hasReproductionSteps": {
        "yes": "2",
        "no": "1",
        "idk": "0"
      },
      "isIssueOnVersions": {
        "0.10": {"yes": 1, "no": 1, "idk": 1},
        "0.11": {"yes": 1, "no": 1, "idk": 1}
      }
    }
}
```

--------------

##### `ResponseStatistics`

```
{
  "total": Number,
  "duplicates": [String | null],
  "inCorrectRepository": <YesNoMaybeTally Object>,
  "hasConsensus": <YesNoMaybeTally Object>,
  "isFeatureRequest": <YesNoMaybeTally Object>,
  "hasReproductionSteps": <YesNoMaybeTally Object>,
  "isIssueOnVersions": {
    <version>: <YesNoMaybeTally Object>, ...
  }
}
```

A object representing collected statistics for a given Github issue. `total`
indicates the total number of responses collected for the issue. The sum of
numbers in each subordinate [`YesNoMaybeTally`](#yesnomaybetally) object will
equal `total`. Found as part of a [`Issue`](#issue) object.

The `<version>` key corresponds to the version of the given repository that
exhibits the issue.

**Example Object**:

```json
{
  "total": "1",
  "duplicates": [
    "#12"
  ],
  "inCorrectRepository": {
    "yes": "0",
    "no": "0",
    "idk": "1"
  },
  "hasConsensus": {
    "yes": "0",
    "no": "0",
    "idk": "1"
  },
  "isFeatureRequest": {
    "yes": "0",
    "no": "0",
    "idk": "1"
  },
  "hasReproductionSteps": {
    "yes": "0",
    "no": "0",
    "idk": "1"
  },
  "isIssueOnVersions": {
    "0.10": {
      "yes": "0",
      "no": "0",
      "idk": "1"
    },
    "0.11": {
      "yes": "0",
      "no": "0",
      "idk": "1"
    }
  }
}
```

--------------

###### `YesNoMaybeTally`

```
{
  "yes": Number,
  "no": Number,
  "idk": Number
}
```

An object representing a tally of the number of "Yes", "No", or "I Don't Know"
responses to a given question of a given issue. Found as part of a
[`ResponseStatistics`](#responsestatistics) object.

---------------

## Endpoints

### Issue-centric Endpoints

#### `GET /api/v1/issues`

**Contents:**

Returns a [`ListContainer`](#listcontainer) object, containing
[`Issue`](#issue) instances for all linked repositories.

**Summary:**

Return a list of **open** issues with statistics for all repositories.

--------------

#### `GET /api/v1/issues/{repoUser}/{repoName}`

**Contents:**

Returns a [`ListContainer`](#listcontainer) object, containing
[`Issue`](#issue) instances for a given repository.

**Summary:**

Return a list of **open** issues with statistics for given repository.

--------------

#### `GET /api/v1/issues/{repoUser}/{repoName}/{issueNumber}`

**Contents:**

Returns a single [`Issue`](#issue) object.

**Summary:**

This endpoint returns a single `Issue` object -- it's useful if you're
building an extension to display triage info on a github issue page. Unlike
the other issue endpoints

--------------

### UserResponse-centric Endpoints

#### `GET /api/v1/responses/all`

**Contents:**

Returns a [`ListContainer`](#listcontainer) object, containing
[`UserResponse`](#userresponse) instances.

**Summary:**

This endpoint returns a list of responses in various states --
these may be in-progress, complete, or skipped. It's mostly useful
to get an idea of the site's activity at a given moment.

--------------

#### `GET /api/v1/responses/complete`

**Contents:**

Returns a [`ListContainer`](#listcontainer) object, containing
[`UserResponse`](#userresponse) instances.

**Summary:**

This endpoint only returns complete responses, suitable for taking
action on.

--------------


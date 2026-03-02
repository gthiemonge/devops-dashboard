Developer dashboard

I want to create a dashboard for developer to track their work in a single place.
The dashboard should be able to track multiple projects/sources:
- projects/organizations on github (new bugs, new PRs)
- changes on gerrit (especially for openstack)
- changes in bugs on launchpad
- updates in JIRA
- observes status of CI jobs in Zuul (peridic or associated with changes/PRs)
then correlates those items between them.

First I want a modular dashboard (with kind of widgets) that would:
- give me the most recent updates in gerrit for a set of openstack project (octavia)
- give me the list of changes in gerrit that i own and that require updates (because of negative review or CI issue)
- give me the list of periodic jobs related to the Octavia project that failed recently

I should be configurable, I should be able to set new widgets for any sources.
I should be able to move the widget and reorganize the dashboard.
On top there should be a global view that summarize the widgets.

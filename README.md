# playwright-framework
This repo is a skeleton framework for creating a Playwright test suite.
Simply copy the template and update as you see fit.

## Installation:
Clone the repo 

`pnpm i` 

`npx playwright install` 

## General Layout:
The layout chosen is to have tests live in their own directory situated in the root.
We then have a src directory that holds the code needed to write the tests. E.G, fixtures, utils, annotations etc.


### Fixtures:
Documentation: https://playwright.dev/docs/test-fixtures

Within the UI tests the use of fixtures is necessary in order to have `page` object provided by Playwright available within 
our util files. 

We use a constructor within our utils, to set the `page` object. In our fixtures we extend the playwright `test` 
object and pass down the `page` object whilst instantiating our util classes.

Then in our tests we import the relevant extended `test` object which will now by default have our utils available as fixtures.

It's possible to have multiple sets of fixtures. You must ensure that you import the `test` object from the correct file if you do so. 

In our API tests we can avoid the need for fixtures as the `request` object is available directly from Playwright.
As a result we don't need classes to be instantiated and do not require custom fixtures for this use case.

### Test Annotations:
As part of our testing strategy as a business we use BDD and Gherkin syntax.
Previously we used the cucumber framework to do this, but this isn't supported by Playwright.

As a result we have needed to come up with a way of still implementing BDD within our tests and our reporting.

The `anotate` method can be used within any spec file, to create BDD steps in the tests, as well as adding
these to the reports. 
By doing this we retain the ability to have easily readable steps in tests whilst also
having reports that contain these, akin to feature files in Cucumber,

### Actions:
Actions are a way of us reducing the amount of code within our spec files to maintain readability.
They are essentially a collection of utils that together create an 'action' that a user might perform.
A very simple example has been given. An example in a complex application might be the action of 
making a payment. For example, we might have Utils for filling in personal details, card details etc. We
could then combine them into one 'action' and that is then called in the spec file.
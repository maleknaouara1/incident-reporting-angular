import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IncidentDetailsComponent } from './incident-details.component';
import { IncidentHistoryAction, IncidentHistoryDto } from '../../../core/models/incident.model';
import { API_BASE_URL } from '../../../core/config/api.config';

const ME = '11111111-1111-1111-1111-111111111111';
const ENGINEER = 'aa791027-c98f-4eb5-8cc6-e5901d988d33';
const REPORTER = '407ecac5-e016-46a0-aab8-7cc89f85f99e';

const history = (action: IncidentHistoryAction, overrides: Partial<IncidentHistoryDto> = {}): IncidentHistoryDto => ({
  id: 'h1',
  incidentId: 'inc-1',
  action,
  description: 'raw description',
  oldValue: null,
  newValue: null,
  changedByUserId: null,
  createdAtUtc: new Date().toISOString(),
  ...overrides
});

describe('IncidentDetailsComponent history formatting', () => {
  let component: IncidentDetailsComponent;

  beforeEach(() => {
    localStorage.setItem('auth_session', JSON.stringify({
      userId: ME, fullName: 'Me', email: 'me@test.test', role: 2,
      accessToken: 'a', refreshToken: 'r', expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString()
    }));
    TestBed.configureTestingModule({
      imports: [IncidentDetailsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    // ngOnInit is not run: no API calls, only the formatting helpers are exercised
    component = TestBed.createComponent(IncidentDetailsComponent).componentInstance;
    component.incident = { createdByUserId: REPORTER } as typeof component.incident;
  });

  afterEach(() => localStorage.clear());

  it('shows readable status names instead of enum names', () => {
    const item = history(IncidentHistoryAction.StatusChanged, { oldValue: 'Assigned', newValue: 'InProgress' });
    expect(component.historyValue(item, item.oldValue)).toBe('Assigned');
    expect(component.historyValue(item, item.newValue)).toBe('In Progress');
  });

  it('shows the assignee instead of a GUID', () => {
    const item = history(IncidentHistoryAction.Assigned, { newValue: ENGINEER });
    expect(component.historyValue(item, item.newValue)).toBe('User #aa791027');
    expect(component.historyValue(item, ME)).toBe('You');
  });

  it('uses names when the user directory is loaded (Admins)', () => {
    (component as unknown as { userNames: Map<string, string> }).userNames = new Map([[ENGINEER, 'Eric Engineer']]);
    const item = history(IncidentHistoryAction.Assigned, { newValue: ENGINEER });
    expect(component.historyValue(item, item.newValue)).toBe('Eric Engineer');
  });

  it('replaces raw descriptions that contain user ids', () => {
    expect(component.historyDescription(history(IncidentHistoryAction.Created))).toBe('Reported by User #407ecac5');
    expect(component.historyDescription(history(IncidentHistoryAction.CommentAdded, { changedByUserId: ME }))).toBe('By You');
    expect(component.historyDescription(history(IncidentHistoryAction.StatusChanged, {
      description: 'Incident status updated from Assigned to InProgress.', changedByUserId: ENGINEER
    }))).toBe('By User #aa791027');
  });

  it('keeps the API description for other actions', () => {
    const item = history(IncidentHistoryAction.AiAnalysisGenerated, { description: 'AI Analysis completed.' });
    expect(component.historyDescription(item)).toBe('AI Analysis completed.');
  });

  it('leaves unknown values untouched', () => {
    const item = history(IncidentHistoryAction.StatusChanged, { newValue: 'Archived' });
    expect(component.historyValue(item, item.newValue)).toBe('Archived');
  });
});

describe('IncidentDetailsComponent user directory', () => {
  const DIRECTORY_URL = `${API_BASE_URL}/api/users/directory`;

  const create = (role: number) => {
    localStorage.setItem('auth_session', JSON.stringify({
      userId: ME, fullName: 'Me', email: 'me@test.test', role,
      accessToken: 'a', refreshToken: 'r', expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString()
    }));
    TestBed.configureTestingModule({
      imports: [IncidentDetailsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    const component = TestBed.createComponent(IncidentDetailsComponent).componentInstance;
    component.ngOnInit();
    return { component, http: TestBed.inject(HttpTestingController) };
  };

  afterEach(() => localStorage.clear());

  it('loads the staff directory for Engineers and shows names', () => {
    const { component, http } = create(2);

    http.expectOne(DIRECTORY_URL).flush({
      success: true, message: '', errors: null,
      data: [
        { id: ENGINEER, fullName: 'Eric Engineer', role: 2, isActive: true },
        { id: REPORTER, fullName: 'Rita Reporter', role: 1, isActive: true }
      ]
    });

    expect(component.userLabel(REPORTER)).toBe('Rita Reporter');
    // Only active staff can be picked as assignees
    expect(component.assignees.map(u => u.fullName)).toEqual(['Eric Engineer']);
  });

  it('does not call the directory for Reporters', () => {
    const { component, http } = create(1);

    http.expectNone(DIRECTORY_URL);
    expect(component.userLabel(ENGINEER)).toBe('User #aa791027');
  });
});
